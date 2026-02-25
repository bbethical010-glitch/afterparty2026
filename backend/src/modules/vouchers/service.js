import { withTransaction } from '../../db/pool.js';
import { httpError } from '../../utils/httpError.js';

function validateEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    throw httpError(400, 'A voucher requires at least 2 entries');
  }

  const debit = entries
    .filter((entry) => entry.entryType === 'DR')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const credit = entries
    .filter((entry) => entry.entryType === 'CR')
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  if (Number(debit.toFixed(2)) !== Number(credit.toFixed(2))) {
    throw httpError(400, 'Voucher is not balanced (debit must equal credit)');
  }
}

async function assertAccountsBelongToBusiness(client, businessId, entries) {
  const accountIds = [...new Set(entries.map((line) => line.accountId))];
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM accounts
     WHERE business_id = $1
       AND id = ANY($2::uuid[])`,
    [businessId, accountIds]
  );

  if (result.rows[0].count !== accountIds.length) {
    throw httpError(400, 'One or more accounts do not belong to the business');
  }
}

async function insertEntries(client, transactionId, entries) {
  for (let i = 0; i < entries.length; i += 1) {
    const line = entries[i];
    await client.query(
      `INSERT INTO transaction_entries (transaction_id, line_no, account_id, entry_type, amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [transactionId, i + 1, line.accountId, line.entryType, line.amount]
    );
  }
}

async function insertAuditLog(client, params) {
  await client.query(
    `INSERT INTO audit_logs (business_id, actor_id, action, entity_type, entity_id, before_json, after_json, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)`,
    [
      params.businessId,
      params.actorId || 'SYSTEM',
      params.action,
      params.entityType,
      params.entityId,
      params.beforeJson ? JSON.stringify(params.beforeJson) : null,
      params.afterJson ? JSON.stringify(params.afterJson) : null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ]
  );
}

export async function createVoucher(payload) {
  validateEntries(payload.entries);

  return withTransaction(async (client) => {
    await assertAccountsBelongToBusiness(client, payload.businessId, payload.entries);

    const transactionRes = await client.query(
      `INSERT INTO transactions (business_id, txn_date, narration)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [payload.businessId, payload.voucherDate, payload.narration || null]
    );

    const transactionId = transactionRes.rows[0].id;

    await insertEntries(client, transactionId, payload.entries);

    const voucherRes = await client.query(
      `INSERT INTO vouchers (business_id, transaction_id, voucher_type, voucher_number, voucher_date, narration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        payload.businessId,
        transactionId,
        payload.voucherType,
        payload.voucherNumber,
        payload.voucherDate,
        payload.narration || null
      ]
    );

    const voucherId = voucherRes.rows[0].id;

    await insertAuditLog(client, {
      businessId: payload.businessId,
      actorId: payload.actorId,
      action: 'VOUCHER_CREATED',
      entityType: 'voucher',
      entityId: voucherId,
      afterJson: {
        voucherType: payload.voucherType,
        voucherNumber: payload.voucherNumber,
        voucherDate: payload.voucherDate,
        narration: payload.narration,
        entries: payload.entries
      }
    });

    return {
      id: voucherId,
      transactionId
    };
  });
}

export async function getVoucherById(voucherId, businessId) {
  const result = await withTransaction(async (client) => {
    const voucherRes = await client.query(
      `SELECT v.id, v.voucher_type AS "voucherType", v.voucher_number AS "voucherNumber",
              v.voucher_date AS "voucherDate", v.narration,
              v.is_reversed AS "isReversed",
              v.reversed_by_voucher_id AS "reversedByVoucherId",
              v.reversed_from_voucher_id AS "reversedFromVoucherId",
              t.id AS "transactionId"
       FROM vouchers v
       JOIN transactions t ON t.id = v.transaction_id
       WHERE v.id = $1 AND v.business_id = $2`,
      [voucherId, businessId]
    );

    if (voucherRes.rows.length === 0) {
      throw httpError(404, 'Voucher not found');
    }

    const voucher = voucherRes.rows[0];
    const entriesRes = await client.query(
      `SELECT te.line_no AS "lineNo", te.account_id AS "accountId", te.entry_type AS "entryType", te.amount
       FROM transaction_entries te
       WHERE te.transaction_id = $1
       ORDER BY te.line_no`,
      [voucher.transactionId]
    );

    return { ...voucher, entries: entriesRes.rows };
  });

  return result;
}

export async function updateVoucher() {
  throw httpError(405, 'Vouchers are immutable after posting. Use reversal instead.');
}

export async function deleteVoucher() {
  throw httpError(405, 'Vouchers are immutable after posting. Use reversal instead of delete.');
}

export async function reverseVoucher(voucherId, payload) {
  return withTransaction(async (client) => {
    const originalVoucherRes = await client.query(
      `SELECT v.id, v.voucher_type AS "voucherType", v.voucher_number AS "voucherNumber",
              v.voucher_date AS "voucherDate", v.narration,
              v.transaction_id AS "transactionId", v.is_reversed AS "isReversed"
       FROM vouchers v
       WHERE v.id = $1 AND v.business_id = $2
       FOR UPDATE`,
      [voucherId, payload.businessId]
    );

    if (originalVoucherRes.rows.length === 0) {
      throw httpError(404, 'Voucher not found');
    }

    const originalVoucher = originalVoucherRes.rows[0];
    if (originalVoucher.isReversed) {
      throw httpError(409, 'Voucher already reversed');
    }

    const originalEntriesRes = await client.query(
      `SELECT te.account_id AS "accountId", te.entry_type AS "entryType", te.amount
       FROM transaction_entries te
       WHERE te.transaction_id = $1
       ORDER BY te.line_no`,
      [originalVoucher.transactionId]
    );

    const reversedEntries = originalEntriesRes.rows.map((line) => ({
      accountId: line.accountId,
      entryType: line.entryType === 'DR' ? 'CR' : 'DR',
      amount: Number(line.amount)
    }));

    const reversalNarration =
      payload.narration ||
      `Reversal of ${originalVoucher.voucherType} ${originalVoucher.voucherNumber} dated ${originalVoucher.voucherDate}`;

    const reversalTxnRes = await client.query(
      `INSERT INTO transactions (business_id, txn_date, narration)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [payload.businessId, payload.reversalDate, reversalNarration]
    );

    const reversalTransactionId = reversalTxnRes.rows[0].id;
    await insertEntries(client, reversalTransactionId, reversedEntries);

    const reversalVoucherRes = await client.query(
      `INSERT INTO vouchers (
         business_id,
         transaction_id,
         voucher_type,
         voucher_number,
         voucher_date,
         narration,
         reversed_from_voucher_id,
         is_system_generated
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id`,
      [
        payload.businessId,
        reversalTransactionId,
        originalVoucher.voucherType,
        payload.reversalVoucherNumber,
        payload.reversalDate,
        reversalNarration,
        voucherId
      ]
    );

    const reversalVoucherId = reversalVoucherRes.rows[0].id;

    await client.query(
      `UPDATE vouchers
       SET is_reversed = TRUE,
           reversed_by_voucher_id = $1
       WHERE id = $2`,
      [reversalVoucherId, voucherId]
    );

    await insertAuditLog(client, {
      businessId: payload.businessId,
      actorId: payload.actorId,
      action: 'VOUCHER_REVERSED',
      entityType: 'voucher',
      entityId: voucherId,
      beforeJson: {
        voucherType: originalVoucher.voucherType,
        voucherNumber: originalVoucher.voucherNumber,
        voucherDate: originalVoucher.voucherDate,
        narration: originalVoucher.narration
      },
      afterJson: {
        reversedByVoucherId: reversalVoucherId,
        reversalVoucherNumber: payload.reversalVoucherNumber,
        reversalDate: payload.reversalDate
      },
      metadata: {
        reversalVoucherId
      }
    });

    await insertAuditLog(client, {
      businessId: payload.businessId,
      actorId: payload.actorId,
      action: 'VOUCHER_CREATED_BY_REVERSAL',
      entityType: 'voucher',
      entityId: reversalVoucherId,
      afterJson: {
        reversedFromVoucherId: voucherId,
        voucherType: originalVoucher.voucherType,
        voucherNumber: payload.reversalVoucherNumber,
        voucherDate: payload.reversalDate,
        entries: reversedEntries
      }
    });

    return {
      originalVoucherId: voucherId,
      reversalVoucherId,
      reversalTransactionId
    };
  });
}
