import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { focusGraph } from '../../core/FocusGraph';
import { commandBus, COMMANDS } from '../../core/CommandBus';

export function UserCreateForm() {
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        username: '',
        displayName: '',
        password: '',
        role: 'ACCOUNTANT'
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const stateRef = useRef({ form, submit: handleSubmit });
    useEffect(() => {
        stateRef.current = { form, submit: handleSubmit };
    });

    const createMutation = useMutation({
        mutationFn: (data) => api.post('/auth/users', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            commandBus.dispatch(COMMANDS.VIEW_POP);
        },
        onError: (err) => {
            setError(err.message || 'Failed to create user');
            setIsSubmitting(false);
            setTimeout(() => focusGraph.setCurrentNode('username'), 50);
        }
    });

    function handleSubmit() {
        if (!stateRef.current.form.username || !stateRef.current.form.password) {
            setError('Username and password are required');
            focusGraph.setCurrentNode('username');
            return;
        }
        setError('');
        setIsSubmitting(true);
        createMutation.mutate(stateRef.current.form);
    }

    function handleChange(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    useEffect(() => {
        focusGraph.init('user-create');

        focusGraph.registerNode('username', { next: 'displayName', prev: null });
        focusGraph.registerNode('displayName', { next: 'password', prev: 'username' });
        focusGraph.registerNode('password', { next: 'role', prev: 'displayName' });
        focusGraph.registerNode('role', {
            next: () => {
                stateRef.current.submit();
                return null;
            },
            prev: 'password'
        });

        setTimeout(() => focusGraph.setCurrentNode('username'), 50);

        return () => focusGraph.destroy();
    }, []);

    return (
        <section className="tally-panel max-w-lg mx-auto mt-10">
            <div className="tally-panel-header bg-tally-header text-white px-2 py-1">
                User Creation
            </div>
            <div className="p-4 grid gap-3 text-sm">
                <label className="tally-field">
                    <span className="tally-field-label">Username</span>
                    <input
                        id="username"
                        className="tally-input"
                        value={form.username}
                        onChange={e => handleChange('username', e.target.value)}
                    />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Display Name</span>
                    <input
                        id="displayName"
                        className="tally-input"
                        value={form.displayName}
                        onChange={e => handleChange('displayName', e.target.value)}
                    />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Password</span>
                    <input
                        id="password"
                        type="password"
                        className="tally-input"
                        value={form.password}
                        onChange={e => handleChange('password', e.target.value)}
                    />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Role</span>
                    <select
                        id="role"
                        className="tally-input focusable"
                        value={form.role}
                        onChange={e => handleChange('role', e.target.value)}
                    >
                        <option value="ACCOUNTANT">ACCOUNTANT</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="VIEWER">VIEWER</option>
                    </select>
                </label>

                {error && <div className="text-tally-warning text-xs font-semibold">{error}</div>}
                {isSubmitting && <div className="text-tally-highlight text-xs font-semibold">Creating...</div>}
            </div>
            <div className="tally-status-bar">
                Enter to accept field · Esc to Cancel
            </div>
        </section>
    );
}
