import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { httpError } from '../../utils/httpError.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const openingPositionRouter = Router();

const stockEntrySchema = z.object({
    sku: z.string().optional(),
    name: z.string().min(1),
    uom: z.string().optional(),
    initialQty: z.number().positive(),
    unitCost: z.number().nonnegative(),
});

const openingBalanceSchema = z.object({
    ledgerName: z.string().min(1),
    group: z.string().min(1),
    drCr: z.enum(['DR', 'CR']),
    amount: z.number().nonnegative()
});

const openingPositionSchema = z.object({
    businessId: z.string().uuid().optional(),
    date: z.string().optional(),
    openingBalances: z.array(openingBalanceSchema),
    items: z.array(stockEntrySchema).optional(),
    stockJournalMetadata: z.object({
        narration: z.string().optional(),
        date: z.string().optional()
    }).optional()
});

openingPositionRouter.post('/', requireAuth, async (req, res, next) => {
    const client = await pool.connect();

    try {
        const businessId = req.user?.businessId;
        if (!businessId) throw httpError(401, 'Business context missing');

        const payload = openingPositionSchema.parse(req.body);

        let totalDr = 0;
        let totalCr = 0;
        let totalInventory = 0;

        payload.openingBalances.forEach(bal => {
            if (bal.drCr === 'DR') totalDr += bal.amount;
            else totalCr += bal.amount;
        });

        if (payload.items) {
            payload.items.forEach(item => {
                totalInventory += item.initialQty * item.unitCost;
            });
            totalDr += totalInventory;
        }

        if (Math.abs(totalDr - totalCr) > 0.01) {
            throw httpError(400, `Imbalanced Opening Position. Debits: ${totalDr}, Credits: ${totalCr}`);
        }

        await client.query('BEGIN');

        // Load all groups
        const groupsRes = await client.query(
            `SELECT id, name, code, parent_group_id, category
       FROM account_groups
       WHERE business_id = $1`,
            [businessId]
        );

        const parentMap = {
            'Cash-in-Hand': 'CA',
            'Bank Accounts': 'CA',
            'Sundry Debtors': 'CA',
            'Sundry Creditors': 'LI',
            'Sales Accounts': 'IN',
            'Purchase Accounts': 'EX',
            'Indirect Expenses': 'EX'
        };

        const ensureGroup = async (groupName) => {
            let existing = groupsRes.rows.find(
                g => g.name.toLowerCase() === groupName.toLowerCase()
            );
            if (existing) return existing.id;

            // Default all new groups under Current Assets
            const parent = groupsRes.rows.find(g => g.code === 'CA');
            if (!parent) return null;

            const inserted = await client.query(
                `INSERT INTO account_groups
     (business_id, name, code, category, parent_group_id, is_system)
     VALUES ($1, $2, $3, $4, $5, FALSE)
     RETURNING id`,
                [
                    businessId,
                    groupName,
                    groupName.toUpperCase().replace(/\s+/g, '-').slice(0, 10),
                    parent.category,
                    parent.id
                ]
            );

            return inserted.rows[0].id;
        };

        const ensureAccount = async (name, groupId, normalBalance) => {
            const code = name.toUpperCase().replace(/\s+/g, '-').slice(0, 20);

            const res = await client.query(
                `SELECT id FROM accounts WHERE business_id = $1 AND name = $2`,
                [businessId, name]
            );
            if (res.rows.length > 0) return res.rows[0].id;

            const inserted = await client.query(
                `INSERT INTO accounts
         (business_id, account_group_id, code, name, normal_balance)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
                [businessId, groupId, code, name, normalBalance]
            );

            return inserted.rows[0].id;
        };

        const voucherDate =
            payload.date ||
            payload.stockJournalMetadata?.date ||
            new Date().toISOString().slice(0, 10);

        const transactionRes = await client.query(
            `INSERT INTO transactions (business_id, txn_date, narration)
       VALUES ($1, $2, $3)
       RETURNING id`,
            [businessId, voucherDate, 'Opening Financial Position Entry']
        );

        const transactionId = transactionRes.rows[0].id;

        const voucherRes = await client.query(
            `INSERT INTO vouchers
       (business_id, transaction_id, voucher_type, voucher_number, voucher_date, narration, is_system_generated)
       VALUES ($1, $2, 'JOURNAL', $3, $4, 'Opening Financial Position Entry', TRUE)
       RETURNING id`,
            [businessId, transactionId, `OP-BAL-${Date.now()}`, voucherDate]
        );

        const voucherId = voucherRes.rows[0].id;

        let lineNo = 1;
        let ledgerCount = 0;

        for (const bal of payload.openingBalances) {
            if (bal.amount <= 0) continue;

            const groupId = await ensureGroup(bal.group);
            if (!groupId) throw httpError(400, `Account Group not found: ${bal.group}`);

            const actId = await ensureAccount(bal.ledgerName, groupId, bal.drCr);
            ledgerCount++;

            await client.query(
                `INSERT INTO transaction_entries
         (transaction_id, line_no, account_id, entry_type, amount)
         VALUES ($1, $2, $3, $4, $5)`,
                [transactionId, lineNo++, actId, bal.drCr, bal.amount]
            );
        }

        if (totalInventory > 0) {
            const stockGroupId = await ensureGroup('Current Assets');
            const invActId = await ensureAccount('Stock-in-Hand', stockGroupId, 'DR');

            await client.query(
                `INSERT INTO transaction_entries
         (transaction_id, line_no, account_id, entry_type, amount)
         VALUES ($1, $2, $3, 'DR', $4)`,
                [transactionId, lineNo++, invActId, totalInventory]
            );
        }

        if (payload.items?.length) {
            for (const item of payload.items) {
                let productRes = await client.query(
                    `SELECT id FROM products WHERE business_id = $1 AND name = $2`,
                    [businessId, item.name]
                );

                let productId;

                if (productRes.rows.length === 0) {
                    const sku =
                        item.sku ||
                        item.name.toUpperCase().replace(/\s+/g, '-').slice(0, 50);

                    const insertRes = await client.query(
                        `INSERT INTO products (business_id, name, sku, category)
             VALUES ($1, $2, $3, 'General')
             RETURNING id`,
                        [businessId, item.name, sku]
                    );

                    productId = insertRes.rows[0].id;
                } else {
                    productId = productRes.rows[0].id;
                }

                await client.query(
                    `INSERT INTO inventory_transactions
           (business_id, product_id, voucher_id, transaction_date, quantity, unit_cost, total_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        businessId,
                        productId,
                        voucherId,
                        voucherDate,
                        item.initialQty,
                        item.unitCost,
                        item.initialQty * item.unitCost
                    ]
                );
            }
        }

        await client.query(
            `UPDATE businesses
       SET is_initialized = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
            [businessId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            ok: true,
            voucherId,
            ledgerCount,
            stockValue: totalInventory
        });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err instanceof z.ZodError) {
            return next(httpError(400, 'Invalid payload', err.issues));
        }
        next(err);
    } finally {
        client.release();
    }
});