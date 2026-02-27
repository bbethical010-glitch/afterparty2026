import { useEffect, useState } from 'react';
import { focusGraph } from '../../core/FocusGraph';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useViewState } from '../../providers/ViewStateProvider';

/**
 * ChangePasswordPanel — keyboard-only password change.
 */
export function ChangePasswordPanel() {
    const { popScreen } = useViewState();
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');

    useEffect(() => {
        focusGraph.init('change-password-panel');
        focusGraph.registerNode('currentPass', { next: 'newPass', prev: null });
        focusGraph.registerNode('newPass', { next: 'confirmPass', prev: 'currentPass' });
        focusGraph.registerNode('confirmPass', {
            next: () => {
                if (newPass === confirm && newPass.length > 0) {
                    mutation.mutate();
                }
                return null;
            },
            prev: 'newPass'
        });

        setTimeout(() => focusGraph.setCurrentNode('currentPass'), 50);

        return () => focusGraph.destroy();
    }, [newPass, confirm]);

    const mutation = useMutation({
        mutationFn: () => api.post('/auth/change-password', {
            currentPassword: current,
            newPassword: newPass,
        }),
        onSuccess: () => popScreen(),
    });

    return (
        <section className="tally-panel">
            <div className="tally-panel-header">Change Password</div>
            <div className="p-2 grid gap-1 text-sm">
                <label className="tally-field">
                    <span className="tally-field-label">Current Password</span>
                    <input id="currentPass" type="password" className="tally-input" value={current} onChange={(e) => setCurrent(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">New Password</span>
                    <input id="newPass" type="password" className="tally-input" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Confirm New Password</span>
                    <input id="confirmPass" type="password" className="tally-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
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
