import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useViewState } from '../../providers/ViewStateProvider';

/**
 * ChangePasswordPanel — keyboard-only password change.
 */
export function ChangePasswordPanel() {
    const { popScreen } = useViewState();
    const currentRef = useRef(null);
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');

    useEffect(() => {
        requestAnimationFrame(() => currentRef.current?.focus());
    }, []);

    const mutation = useMutation({
        mutationFn: () => api.post('/auth/change-password', {
            currentPassword: current,
            newPassword: newPass,
        }),
        onSuccess: () => popScreen(),
    });

    function onKeyDown(e) {
        if (e.key === 'Escape') { e.preventDefault(); popScreen(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (newPass !== confirm) return;
            mutation.mutate();
        }
    }

    return (
        <section className="tally-panel" onKeyDown={onKeyDown}>
            <div className="tally-panel-header">Change Password</div>
            <div className="p-2 grid gap-1 text-sm">
                <label className="tally-field">
                    <span className="tally-field-label">Current Password</span>
                    <input ref={currentRef} type="password" className="tally-input" value={current} onChange={(e) => setCurrent(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">New Password</span>
                    <input type="password" className="tally-input" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Confirm New Password</span>
                    <input type="password" className="tally-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>
                {newPass && confirm && newPass !== confirm && (
                    <span className="text-tally-warning text-xs">Passwords do not match</span>
                )}
                <div className="tally-status-bar">
                    Ctrl+Enter: Accept · Esc: Back
                    {mutation.isError && <span className="text-tally-warning ml-2">{mutation.error.message}</span>}
                </div>
            </div>
        </section>
    );
}
