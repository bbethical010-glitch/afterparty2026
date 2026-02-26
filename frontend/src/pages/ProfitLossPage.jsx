import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { DrilldownReport } from '../features/reports/DrilldownReport';

export function ProfitLossPage() {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 4) + '-04-01');
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['profit-loss-drill', businessId, from, to],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/profit-loss?from=${from}&to=${to}`)
  });

  const rootData = data
    ? [
      { id: 'income', label: 'Revenue (Income)', amount: data.income },
      { id: 'expense', label: 'Total Expenses', amount: data.expense },
      { id: 'gross', label: 'Gross Profit', amount: data.grossProfit },
      { id: 'op', label: 'Operating Profit', amount: data.operatingProfit },
      { id: 'net', label: 'Net Profit', amount: data.netProfit, isSummary: true }
    ]
    : [];

  return (
    <div className="grid gap-2">
      {/* Period filter */}
      <div className="boxed shadow-panel px-3 py-2 flex gap-3 text-sm items-center">
        <span className="font-semibold">Period:</span>
        <input
          type="date"
          className="focusable border border-tally-panelBorder bg-white p-1"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span>to</span>
        <input
          type="date"
          className="focusable border border-tally-panelBorder bg-white p-1"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="boxed shadow-panel px-3 py-4 text-sm">Loading Profit & Loss...</div>
      ) : (
        <DrilldownReport
          title="Profit & Loss"
          rootData={rootData}
          columns={[
            { key: 'label', label: 'Particulars' },
            { key: 'amount', label: 'Amount (₹)', align: 'right', isAmount: true }
          ]}
        />
      )}
    </div>
  );
}
