import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useViewState, SCREENS } from '../../providers/ViewStateProvider';
import { useFocusList, useAutoFocus } from '../../lib/FocusManager';

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Trial Balance ──────────────────────────── */

export function TrialBalancePanel() {
  const { pushScreen, popScreen } = useViewState();
  const { user } = useAuth();
  const businessId = user?.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 4) + '-04-01');
  const [to, setTo] = useState(today);

  // Internal drilldown stack
  const [drillStack, setDrillStack] = useState([]); // each: { category, lines }
  const level = drillStack.length; // 0 = categories, 1 = lines within category

  const { data } = useQuery({
    queryKey: ['trial-balance', businessId, from, to],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/trial-balance?from=${from}&to=${to}`),
  });

  const grouped = data?.grouped || {};
  const categories = useMemo(() => Object.keys(grouped), [grouped]);

  // Determine what to display
  const displayItems = level === 0
    ? categories.map((cat) => ({
      label: cat,
      debit: grouped[cat]?.debit,
      credit: grouped[cat]?.credit,
      isCategory: true,
    }))
    : (drillStack[0]?.lines || []).map((line) => ({
      label: `${line.code} — ${line.name}`,
      debit: line.debit,
      credit: line.credit,
      accountId: line.accountId,
      groupName: line.groupName,
    }));

  const { activeIndex, containerProps } = useFocusList(displayItems.length, {
    onSelect: (idx) => {
      const item = displayItems[idx];
      if (level === 0 && item.isCategory) {
        // Drill into category
        setDrillStack([{ category: item.label, lines: grouped[item.label]?.lines || [] }]);
      } else if (level === 1 && item.accountId) {
        // Drill into ledger
        pushScreen(SCREENS.LEDGER_LIST, { accountId: item.accountId });
      }
    },
    onBack: () => {
      if (level > 0) setDrillStack([]);
      else popScreen();
    },
  });

  useAutoFocus(containerProps.ref);

  const breadcrumb = level === 0 ? 'Trial Balance' : `Trial Balance › ${drillStack[0]?.category}`;

  return (
    <section className="tally-panel">
      <div className="tally-panel-header">{breadcrumb}</div>
      <div className="p-1 grid gap-1 md:grid-cols-2 text-xs">
        <input type="date" className="tally-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="tally-input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {!data?.isBalanced && (
        <div className="px-2 py-1 text-xs text-tally-warning font-bold border-b border-tally-panelBorder">
          ⚠ Mismatch: ₹ {formatAmount(data?.difference)}
        </div>
      )}

      <div {...containerProps} className="max-h-[calc(100vh-200px)] overflow-auto" style={{ outline: 'none' }}>
        <table className="w-full table-grid text-sm">
          <thead className="tally-table-header">
            <tr>
              <th className="text-left">{level === 0 ? 'Category' : 'Account'}</th>
              {level === 1 && <th className="text-left">Group</th>}
              <th className="text-right">Debit</th>
              <th className="text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item, idx) => (
              <tr
                key={idx}
                data-focus-index={idx}
                className={`${idx === activeIndex ? 'tally-row-active' : ''} ${item.isCategory ? 'font-bold' : ''}`}
              >
                <td className="px-2 py-0.5">{item.label}</td>
                {level === 1 && <td className="px-2 py-0.5 text-xs opacity-70">{item.groupName || ''}</td>}
                <td className="text-right px-2 py-0.5 tally-amount">{formatAmount(item.debit)}</td>
                <td className="text-right px-2 py-0.5 tally-amount">{formatAmount(item.credit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tally-table-header font-bold">
              <td className="px-2 py-0.5" colSpan={level === 1 ? 2 : 1}>Totals</td>
              <td className="text-right px-2 py-0.5 tally-amount">{formatAmount(data?.totals?.debit)}</td>
              <td className="text-right px-2 py-0.5 tally-amount">{formatAmount(data?.totals?.credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="tally-status-bar">↑↓ Navigate · Enter Drill · Esc/Backspace Back</div>
    </section>
  );
}

/* ── Profit & Loss ──────────────────────────── */

export function ProfitLossPanel() {
  const { popScreen } = useViewState();
  const { user } = useAuth();
  const businessId = user?.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 4) + '-04-01');
  const [to, setTo] = useState(today);

  const { data } = useQuery({
    queryKey: ['profit-loss', businessId, from, to],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/profit-loss?from=${from}&to=${to}`),
  });

  const rows = [
    { label: 'Revenue', value: data?.income },
    { label: 'Expenses', value: data?.expense },
    { label: 'Gross Profit', value: data?.grossProfit },
    { label: 'Operating Profit', value: data?.operatingProfit },
    { label: 'Net Profit', value: data?.netProfit, bold: true },
  ];

  const { activeIndex, containerProps } = useFocusList(rows.length, {
    onBack: () => popScreen(),
  });

  useAutoFocus(containerProps.ref);

  return (
    <section className="tally-panel">
      <div className="tally-panel-header">Profit & Loss</div>
      <div className="p-1 grid gap-1 md:grid-cols-2 text-xs">
        <input type="date" className="tally-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="tally-input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div {...containerProps} style={{ outline: 'none' }}>
        <table className="w-full table-grid text-sm">
          <thead className="tally-table-header">
            <tr><th className="text-left">Particulars</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                data-focus-index={idx}
                className={`${idx === activeIndex ? 'tally-row-active' : ''} ${row.bold ? 'font-bold' : ''}`}
              >
                <td className="px-2 py-0.5">{row.label}</td>
                <td className="text-right px-2 py-0.5 tally-amount">₹ {formatAmount(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tally-status-bar">↑↓ Navigate · Esc Back</div>
    </section>
  );
}

/* ── Balance Sheet ──────────────────────────── */

export function BalanceSheetPanel() {
  const { popScreen } = useViewState();
  const { user } = useAuth();
  const businessId = user?.businessId;
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 4) + '-04-01');
  const [to, setTo] = useState(today);

  const { data } = useQuery({
    queryKey: ['balance-sheet', businessId, from, to],
    enabled: Boolean(businessId),
    queryFn: () => api.get(`/reports/balance-sheet?from=${from}&to=${to}`),
  });

  const rows = [
    { label: 'Total Assets', value: data?.assets },
    { label: 'Total Liabilities', value: data?.liabilities },
    { label: 'Equity (incl. retained earnings)', value: data?.equity },
    { label: 'Retained Earnings', value: data?.retainedEarnings },
    { label: 'Liabilities + Equity', value: data?.liabilitiesAndEquity, bold: true },
  ];

  const { activeIndex, containerProps } = useFocusList(rows.length, {
    onBack: () => popScreen(),
  });

  useAutoFocus(containerProps.ref);

  return (
    <section className="tally-panel">
      <div className="tally-panel-header">Balance Sheet</div>
      <div className="p-1 grid gap-1 md:grid-cols-2 text-xs">
        <input type="date" className="tally-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="tally-input" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div {...containerProps} style={{ outline: 'none' }}>
        <table className="w-full table-grid text-sm">
          <thead className="tally-table-header">
            <tr><th className="text-left">Particulars</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                data-focus-index={idx}
                className={`${idx === activeIndex ? 'tally-row-active' : ''} ${row.bold ? 'font-bold' : ''}`}
              >
                <td className="px-2 py-0.5">{row.label}</td>
                <td className="text-right px-2 py-0.5 tally-amount">₹ {formatAmount(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.abs(Number(data?.equationDifference || 0)) > 0.01 && (
        <div className="px-2 py-1 text-xs text-tally-warning font-bold border-t border-tally-panelBorder">
          ⚠ Equation mismatch: ₹ {formatAmount(data?.equationDifference)}
        </div>
      )}
      <div className="tally-status-bar">↑↓ Navigate · Esc Back</div>
    </section>
  );
}
