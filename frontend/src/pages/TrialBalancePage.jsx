import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { DrilldownReport } from '../features/reports/DrilldownReport';
import { useNavigate } from 'react-router-dom';

export function TrialBalancePage() {
  const { user } = useAuth();
  const businessId = user?.businessId;
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 4) + '-04-01');
  const [to, setTo] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance-drill', businessId, from, to],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/trial-balance?from=${from}&to=${to}`)
  });

  // Build flat drilldown rows from grouped trial balance
  const grouped = data?.grouped || {};
  const rootData = Object.entries(grouped).map(([category, block]) => ({
    id: category,
    label: category,
    amount: block.debit - block.credit,
    hasChildren: block.lines?.length > 0,
    children: (block.lines || []).map((line) => ({
      id: line.accountId || line.code,
      label: `${line.name} (${line.code})`,
      amount: line.debit - line.credit,
      voucherId: null,
      // When Enter is pressed on a ledger line, navigate to ledger
      onEnter: () => navigate(`/ledger?accountId=${line.accountId}`)
    }))
  }));

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
        {data && !data.isBalanced && (
          <span className="text-tally-warning font-semibold text-xs ml-auto">
            ⚠ Unbalanced: Diff ₹{Number(data.difference || 0).toFixed(2)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="boxed shadow-panel px-3 py-4 text-sm">Loading Trial Balance...</div>
      ) : (
        <DrilldownReport
          title="Trial Balance"
          rootData={rootData}
          columns={[
            { key: 'label', label: 'Account / Group' },
            { key: 'amount', label: 'Balance (₹)', align: 'right', isAmount: true }
          ]}
        />
      )}
    </div>
  );
}
