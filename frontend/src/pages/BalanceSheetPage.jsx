import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { DrilldownReport } from '../features/reports/DrilldownReport';

export function BalanceSheetPage() {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet-drill', businessId, today],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/balance-sheet?from=${today.slice(0, 4)}-04-01&to=${today}`)
  });

  // Build drilldown rows from balance sheet data
  const rootData = data
    ? [
      { id: 'assets', label: 'Assets', amount: data.assets, hasChildren: false },
      { id: 'liabilities', label: 'Liabilities', amount: data.liabilities, hasChildren: false },
      { id: 'equity', label: 'Equity (incl. retained)', amount: data.equity, hasChildren: false },
      { id: 'retained', label: 'Retained Earnings', amount: data.retainedEarnings, hasChildren: false },
      {
        id: 'total',
        label: 'Liabilities + Equity',
        amount: data.liabilitiesAndEquity,
        isSummary: true,
        hasChildren: false
      }
    ]
    : [];

  if (isLoading) {
    return (
      <div className="boxed shadow-panel px-3 py-4 text-sm">Loading Balance Sheet...</div>
    );
  }

  return (
    <DrilldownReport
      title="Balance Sheet"
      rootData={rootData}
      columns={[
        { key: 'label', label: 'Particulars' },
        { key: 'amount', label: 'Amount (₹)', align: 'right', isAmount: true }
      ]}
    />
  );
}
