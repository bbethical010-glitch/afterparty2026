import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { announceToScreenReader } from '../../hooks/useFocusUtilities';

/**
 * DrilldownReport — Reusable Tally-style hierarchical drilldown report.
 *
 * Props:
 *   title        — Report title shown in header
 *   rootData     — Array of top-level rows [{id, label, amount, children?, ...}]
 *   onFetchChildren(rowId) → Promise<Array> — Called when drilling into a row
 *   onOpenVoucher(voucherId) — Called when focusing/selecting a voucher row
 *   columns      — [{key, label, align}] — Column definitions
 *
 * Navigation:
 *   Arrow Down/Up — move between rows
 *   Enter         — drill down into row (if has children)
 *   Backspace/Esc — go up one level
 *   Alt+Left      — go to top / go back in browser
 */
export function DrilldownReport({ title, rootData = [], onFetchChildren, onOpenVoucher, columns = [] }) {
    const navigate = useNavigate();

    // Navigation stack: [{label, data}]
    const [stack, setStack] = useState([{ label: title, data: rootData }]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    const current = stack[stack.length - 1];
    const rows = current?.data || [];

    // When rootData changes (e.g. async load), update top of stack
    useEffect(() => {
        setStack([{ label: title, data: rootData }]);
        setActiveIdx(0);
    }, [rootData, title]);

    // Scroll active row into view
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const row = container.querySelector(`[data-drill-row="${activeIdx}"]`);
        row?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    async function drillDown(row) {
        if (!row) return;

        // If row is a voucher (leaf), open it
        if (row.voucherId) {
            onOpenVoucher?.(row.voucherId);
            navigate(`/vouchers/${row.voucherId}/edit`);
            return;
        }

        // If row has inline children, push them
        if (Array.isArray(row.children) && row.children.length > 0) {
            setStack((s) => [...s, { label: row.label || row.name, data: row.children }]);
            setActiveIdx(0);
            announceToScreenReader(`Opened ${row.label || row.name}`);
            return;
        }

        // Otherwise fetch from server
        if (onFetchChildren) {
            setLoading(true);
            try {
                const children = await onFetchChildren(row.id);
                if (children && children.length > 0) {
                    setStack((s) => [...s, { label: row.label || row.name, data: children }]);
                    setActiveIdx(0);
                    announceToScreenReader(`Opened ${row.label || row.name}`);
                } else {
                    announceToScreenReader(`No sub-entries for ${row.label || row.name}`);
                }
            } finally {
                setLoading(false);
            }
        }
    }

    function drillUp() {
        if (stack.length <= 1) {
            navigate(-1);
            return;
        }
        setStack((s) => s.slice(0, -1));
        setActiveIdx(0);
        announceToScreenReader('Went back one level');
    }

    function onKeyDown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, rows.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                drillDown(rows[activeIdx]);
                break;
            case 'Backspace':
            case 'Escape':
                e.preventDefault();
                drillUp();
                break;
            case 'ArrowLeft':
                if (e.altKey) { e.preventDefault(); drillUp(); }
                break;
        }
    }

    function formatAmount(val) {
        return Number(val || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    return (
        <section className="boxed shadow-panel" onKeyDown={onKeyDown} tabIndex={-1} ref={containerRef}>
            {/* Header */}
            <div className="bg-tally-header text-white px-3 py-2 text-sm font-semibold flex items-center justify-between">
                <span>{title}</span>
                <span className="text-xs font-normal opacity-75">
                    ↑↓ Navigate · Enter Drill · Esc/Backspace Back
                </span>
            </div>

            {/* Breadcrumb */}
            {stack.length > 1 && (
                <div className="px-3 py-1 bg-tally-tableHeader border-b border-tally-panelBorder text-[11px] flex items-center gap-1 flex-wrap">
                    {stack.map((level, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                            {idx > 0 && <span className="opacity-40">›</span>}
                            <button
                                className="focusable hover:underline opacity-70 hover:opacity-100"
                                onClick={() => {
                                    setStack((s) => s.slice(0, idx + 1));
                                    setActiveIdx(0);
                                }}
                            >
                                {level.label}
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="overflow-auto max-h-[calc(100vh-200px)]">
                <table className="w-full table-grid text-sm">
                    <thead className="bg-tally-tableHeader sticky top-0 z-10">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                                    {col.label}
                                </th>
                            ))}
                            {columns.length === 0 && (
                                <>
                                    <th className="text-left">Particulars</th>
                                    <th className="text-right">Amount (₹)</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={columns.length || 2} className="text-center py-3 text-xs opacity-60">
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {!loading && rows.map((row, idx) => {
                            const isActive = idx === activeIdx;
                            const hasChildren = row.children?.length > 0 || row.hasChildren || row.voucherId;
                            return (
                                <tr
                                    key={row.id ?? idx}
                                    data-drill-row={idx}
                                    className={`cursor-pointer select-none ${isActive ? 'bg-tally-rowHover text-white' : 'hover:bg-tally-background'} ${row.isSummary ? 'font-semibold bg-tally-tableHeader' : ''}`}
                                    onClick={() => { setActiveIdx(idx); drillDown(row); }}
                                    onMouseEnter={() => setActiveIdx(idx)}
                                >
                                    {columns.length > 0
                                        ? columns.map((col) => (
                                            <td key={col.key} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                                                {col.key === columns[0].key && hasChildren && (
                                                    <span className="text-[10px] mr-1 opacity-60">▶</span>
                                                )}
                                                {col.isAmount
                                                    ? `₹ ${formatAmount(row[col.key])}`
                                                    : (row[col.key] ?? '—')}
                                            </td>
                                        ))
                                        : (
                                            <>
                                                <td>
                                                    {hasChildren && <span className="text-[10px] mr-1 opacity-60">▶</span>}
                                                    {row.label || row.name}
                                                </td>
                                                <td className="text-right">₹ {formatAmount(row.amount ?? row.balance)}</td>
                                            </>
                                        )}
                                </tr>
                            );
                        })}
                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length || 2} className="text-center py-4 text-xs opacity-60">
                                    No data available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-3 py-1 border-t border-tally-panelBorder text-[11px] opacity-60">
                ↑↓ to navigate · Enter to drill down · Backspace/Esc to go up · Alt+Left to go back
            </div>
        </section>
    );
}
