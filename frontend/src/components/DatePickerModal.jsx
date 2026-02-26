import { useEffect, useRef, useState } from 'react';

/**
 * DatePickerModal — F2 "Change Date" modal.
 * Sets the global "working date" for voucher entry.
 */
export function DatePickerModal({ open, currentDate, onClose, onDateChange }) {
    const [date, setDate] = useState(currentDate || new Date().toISOString().slice(0, 10));
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setDate(currentDate || new Date().toISOString().slice(0, 10));
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open, currentDate]);

    function handleKeyDown(e) {
        if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        if (e.key === 'Enter') { e.preventDefault(); handleAccept(); }
    }

    function handleAccept() {
        onDateChange(date);
        onClose();
    }

    if (!open) return null;

    return (
        <div
            className="command-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Change Date"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="boxed shadow-panel w-80 bg-white">
                <div className="bg-tally-header text-white px-3 py-2 text-sm font-semibold flex items-center justify-between">
                    <span>Change Date (F2)</span>
                    <span className="text-xs font-normal opacity-75">Enter Accept · Esc Cancel</span>
                </div>
                <div className="p-4 grid gap-3 text-sm">
                    <label className="flex flex-col gap-1">
                        Current Date
                        <input
                            ref={inputRef}
                            type="date"
                            className="focusable border border-tally-panelBorder bg-white p-2"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </label>
                    <div className="flex gap-2">
                        <button
                            className="focusable bg-tally-header text-white border border-tally-panelBorder px-3 py-1"
                            onClick={handleAccept}
                        >
                            Accept (Enter)
                        </button>
                        <button
                            className="focusable boxed px-3 py-1"
                            onClick={onClose}
                        >
                            Cancel (Esc)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
