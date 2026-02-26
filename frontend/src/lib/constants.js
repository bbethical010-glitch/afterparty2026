export const VOUCHER_TYPES = ['JOURNAL', 'PAYMENT', 'RECEIPT', 'SALES', 'PURCHASE', 'CONTRA'];
export const VOUCHER_STATUSES = ['DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'];
export const USER_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'VIEWER'];

/**
 * Tally ERP-style Chart of Accounts group hierarchy.
 * Used in LedgerCreateForm GroupSelector.
 */
export const TALLY_GROUP_HIERARCHY = [
    {
        id: 'assets',
        label: 'Assets',
        category: 'CURRENT_ASSET',
        code: 'CA',
        children: [
            { id: 'cash-in-hand', label: 'Cash-in-Hand', code: 'CA-CASH', category: 'CURRENT_ASSET' },
            { id: 'bank-accounts', label: 'Bank Accounts', code: 'CA-BANK', category: 'CURRENT_ASSET' },
            { id: 'sundry-debtors', label: 'Sundry Debtors', code: 'CA-AR', category: 'CURRENT_ASSET' },
            { id: 'stock-in-hand', label: 'Stock-in-Hand', code: 'CA-STOCK', category: 'CURRENT_ASSET' },
            { id: 'fixed-assets', label: 'Fixed Assets', code: 'FA', category: 'FIXED_ASSET' },
            { id: 'deposits', label: 'Deposits (Asset)', code: 'CA-DEP', category: 'CURRENT_ASSET' },
            { id: 'loans-advances-asset', label: 'Loans & Advances (Asset)', code: 'CA-LOAN', category: 'CURRENT_ASSET' }
        ]
    },
    {
        id: 'liabilities',
        label: 'Liabilities',
        category: 'LIABILITY',
        code: 'LI',
        children: [
            { id: 'sundry-creditors', label: 'Sundry Creditors', code: 'LI-AP', category: 'LIABILITY' },
            { id: 'duties-taxes', label: 'Duties & Taxes', code: 'LI-TAX', category: 'LIABILITY' },
            { id: 'loans-secured', label: 'Loans (Secured)', code: 'LI-LSEC', category: 'LIABILITY' },
            { id: 'loans-unsecured', label: 'Loans (Unsecured)', code: 'LI-LUNS', category: 'LIABILITY' },
            { id: 'capital-account', label: 'Capital Account', code: 'EQ', category: 'EQUITY' }
        ]
    },
    {
        id: 'income',
        label: 'Income',
        category: 'INCOME',
        code: 'IN',
        children: [
            { id: 'direct-income', label: 'Direct Income', code: 'IN-DIR', category: 'INCOME' },
            { id: 'indirect-income', label: 'Indirect Income', code: 'IN-IND', category: 'INCOME' },
            { id: 'sales-accounts', label: 'Sales Accounts', code: 'IN-SALES', category: 'INCOME' }
        ]
    },
    {
        id: 'expenses',
        label: 'Expenses',
        category: 'EXPENSE',
        code: 'EX',
        children: [
            { id: 'direct-expenses', label: 'Direct Expenses', code: 'EX-DIR', category: 'EXPENSE' },
            { id: 'indirect-expenses', label: 'Indirect Expenses', code: 'EX-IND', category: 'EXPENSE' },
            { id: 'purchase-accounts', label: 'Purchase Accounts', code: 'EX-PUR', category: 'EXPENSE' }
        ]
    }
];

