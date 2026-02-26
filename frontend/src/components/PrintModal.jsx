import { useEffect, useRef } from 'react';

/**
 * PrintModal — Invoice print preview with Tally-style layout.
 * Opens via Ctrl+P on VoucherEntryForm for POSTED vouchers.
 * Ctrl+P inside modal triggers window.print(), Esc closes.
 */
export function PrintModal({ open, onClose, voucher, company }) {
    const closeRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        // Auto-focus close button so Esc works immediately
        closeRef.current?.focus();

        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                window.print();
            }
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !voucher) return null;

    function formatAmount(value) {
        return Number(value || 0).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    const drLines = voucher.entries?.filter((e) => e.entryType === 'DR') || [];
    const crLines = voucher.entries?.filter((e) => e.entryType === 'CR') || [];
    const totalDr = drLines.reduce((s, e) => s + Number(e.amount || 0), 0);

    return (
        <div
            className="command-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Print Invoice"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="boxed shadow-panel w-full max-w-2xl bg-white print:shadow-none print:border-0">
                {/* Print controls — hidden when printing */}
                <div className="no-print bg-tally-header text-white px-3 py-2 text-sm flex items-center justify-between">
                    <span>Print Preview — {voucher.voucherType} #{voucher.voucherNumber}</span>
                    <div className="flex gap-2 text-xs">
                        <button
                            onClick={() => window.print()}
                            className="focusable boxed bg-white text-tally-text px-3 py-1"
                        >
                            Print (Ctrl+P)
                        </button>
                        <button
                            ref={closeRef}
                            onClick={onClose}
                            className="focusable boxed bg-white text-tally-text px-3 py-1"
                        >
                            Close (Esc)
                        </button>
                    </div>
                </div>

                {/* Invoice layout — shown when printing */}
                <div className="p-6 text-sm print:p-4" id="invoice-print-area">
                    {/* Company header */}
                    <div className="text-center mb-4 pb-2 border-b border-gray-300">
                        <div className="text-lg font-bold">{company?.name || 'Company Name'}</div>
                        {company?.address && (
                            <div className="text-xs text-gray-600 mt-1">{company.address}</div>
                        )}
                    </div>

                    {/* Invoice meta */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                        <div>
                            <div><strong>Invoice No:</strong> {voucher.voucherNumber}</div>
                            <div><strong>Type:</strong> {voucher.voucherType}</div>
                        </div>
                        <div className="text-right">
                            <div><strong>Date:</strong> {voucher.voucherDate
                                ? new Date(voucher.voucherDate).toLocaleDateString('en-IN')
                                : '—'}</div>
                            <div><strong>Status:</strong> {voucher.status}</div>
                        </div>
                    </div>

                    {/* Line items */}
                    <table className="w-full table-grid text-xs mb-4">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="text-left">Particulars</th>
                                <th className="text-left">Group</th>
                                <th className="text-center">Dr/Cr</th>
                                <th className="text-right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voucher.entries?.map((line, idx) => (
                                <tr key={idx}>
                                    <td>{line.accountName || line.accountId}</td>
                                    <td>{line.groupName || '—'}</td>
                                    <td className="text-center">{line.entryType}</td>
                                    <td className="text-right">{formatAmount(line.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-semibold bg-gray-50">
                                <td colSpan={3} className="text-right">Total</td>
                                <td className="text-right">₹ {formatAmount(totalDr)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Narration */}
                    {voucher.narration && (
                        <div className="text-xs mt-2">
                            <strong>Narration:</strong> {voucher.narration}
                        </div>
                    )}

                    {/* Signature */}
                    <div className="mt-8 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs text-center">
                        <div>
                            <div className="border-t border-gray-400 pt-1 mt-6">Prepared By</div>
                        </div>
                        <div>
                            <div className="border-t border-gray-400 pt-1 mt-6">Authorised Signatory</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
