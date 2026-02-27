import { api } from '../../lib/api';
import { computeVoucherTotals } from './voucherService';

/**
 * Runs a comprehensive domain-level accounting sweep on the client-side.
 * It fetches the ledger history and trial balance to verify the system mathematical integrity.
 * 
 * Usage (in dev console or a debug pane):
 * import { auditAccountingIntegrity } from './domain/accounting/diagnostics';
 * auditAccountingIntegrity();
 */
export async function auditAccountingIntegrity() {
    console.group('--- Accounting Integrity Audit ---');
    let issuesFound = 0;

    try {
        // 1. Fetch all vouchers to scan history
        const { items: vouchers } = await api.get('/vouchers?limit=1000');

        console.log(`Scanning ${vouchers?.length || 0} vouchers for balance integrity...`);

        for (const v of vouchers || []) {
            if (v.status === 'POSTED') {
                const detail = await api.get(`/vouchers/${v.id}`);
                const totals = computeVoucherTotals(detail.entries);

                if (!totals.isBalanced) {
                    console.error(`🚨 Imbalanced Voucher Found: ${v.voucherNumber} (ID: ${v.id})\nDiff: ${totals.difference} | DR: ${totals.debit} | CR: ${totals.credit}`);
                    issuesFound++;
                }
            }
        }

        // 2. Fetch Trial Balance and verify total DR == total CR
        console.log('Scanning Trial Balance integrity...');
        const tb = await api.get('/reports/trial-balance');
        const tbDiff = Math.abs(tb.totals.debit - tb.totals.credit).toFixed(2);

        if (tbDiff !== "0.00") {
            console.error(`🚨 Trial Balance Mismatch! DR: ${tb.totals.debit} | CR: ${tb.totals.credit} | Diff: ${tbDiff}`);
            issuesFound++;
        }

        if (issuesFound === 0) {
            console.log('%c✅ ALL CHECKS PASSED: Accounting data is in perfect balance.', 'color: green; font-weight: bold;');
        } else {
            console.error(`❌ AUDIT FAILED: Found ${issuesFound} integrity issues. Wipe database and restart.`);
        }

    } catch (err) {
        console.error('Audit failed to run due to an API error:', err);
    } finally {
        console.groupEnd();
    }
}
