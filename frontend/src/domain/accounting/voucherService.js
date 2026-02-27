/**
 * Accounting Domain Service: Voucher Validation
 * Enforces strict double-entry principles on voucher entries.
 */

export function computeVoucherTotals(entries) {
    if (!Array.isArray(entries)) {
        return { debit: 0, credit: 0, difference: 0, isBalanced: false };
    }

    const debit = entries
        .filter((line) => line.entryType === 'DR')
        .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

    const credit = entries
        .filter((line) => line.entryType === 'CR')
        .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

    const difference = Number((debit - credit).toFixed(2));

    // A voucher is balanced ONLY if debits equal credits and there is at least some value
    const isBalanced = difference === 0 && (debit > 0 || credit > 0);

    return { debit, credit, difference, isBalanced };
}

export function validateVoucher(entries) {
    const validEntries = Array.isArray(entries) ? entries.filter((line) => line.accountId) : [];

    if (validEntries.length < 2) {
        return { isValid: false, error: 'At least 2 ledger lines required' };
    }

    for (let i = 0; i < validEntries.length; i++) {
        const line = validEntries[i];
        if (!Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0) {
            return { isValid: false, error: `Line ${i + 1} must have an amount greater than zero` };
        }
    }

    const totals = computeVoucherTotals(validEntries);
    if (!totals.isBalanced) {
        return { isValid: false, error: `Voucher is not balanced. Difference: ${totals.difference}` };
    }

    return { isValid: true, error: null };
}
