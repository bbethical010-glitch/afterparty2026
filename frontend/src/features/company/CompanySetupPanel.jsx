import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import { useViewState } from '../../providers/ViewStateProvider';
import { focusGraph } from '../../core/FocusGraph';

/**
 * CompanySetupPanel — Tally-style company setup.
 * Ctrl+Enter saves, Esc goes back.
 */
export function CompanySetupPanel() {
    const { user } = useAuth();
    const { popScreen } = useViewState();
    const businessId = user?.businessId;

    const [name, setName] = useState('');
    const [fyStart, setFyStart] = useState('');
    const [currency, setCurrency] = useState('INR');
    const [address, setAddress] = useState('');

    const { data: company } = useQuery({
        queryKey: ['company', businessId],
        enabled: Boolean(businessId),
        queryFn: () => api.get('/businesses/me'),
    });

    useEffect(() => {
        if (company) {
            setName(company.name || '');
            setFyStart(company.financial_year_start || company.financialYearStart || '');
            setCurrency(company.base_currency || company.baseCurrency || 'INR');
            setAddress(company.address || '');
        }
    }, [company]);

    useEffect(() => {
        focusGraph.init('company-setup-panel');
        focusGraph.registerNode('companyName', { next: 'companyFy', prev: null });
        focusGraph.registerNode('companyFy', { next: 'companyCurrency', prev: 'companyName' });
        focusGraph.registerNode('companyCurrency', { next: 'companyAddress', prev: 'companyFy' });
        focusGraph.registerNode('companyAddress', {
            next: () => {
                saveMutation.mutate();
                return null;
            },
            prev: 'companyCurrency'
        });

        setTimeout(() => focusGraph.setCurrentNode('companyName'), 50);

        return () => focusGraph.destroy();
    }, []);

    const queryClient = useQueryClient();
    const saveMutation = useMutation({
        mutationFn: () => api.patch('/businesses/me', {
            name: name || undefined,
            address: address || undefined,
            financialYearStart: fyStart || undefined,
            baseCurrency: currency || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
            popScreen();
        },
    });

    return (
        <section className="tally-panel">
            <div className="tally-panel-header">Company Setup</div>
            <div className="p-2 grid gap-1 text-sm">
                <label className="tally-field">
                    <span className="tally-field-label">Company Name</span>
                    <input id="companyName" className="tally-input" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Financial Year Start</span>
                    <input id="companyFy" type="date" className="tally-input" value={fyStart} onChange={(e) => setFyStart(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Base Currency</span>
                    <input id="companyCurrency" className="tally-input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </label>
                <label className="tally-field">
                    <span className="tally-field-label">Address</span>
                    <textarea id="companyAddress" className="tally-input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <div className="tally-status-bar">
                    Ctrl+Enter: Accept · Esc: Back
                    {saveMutation.isError && <span className="text-tally-warning ml-2">{saveMutation.error.message}</span>}
                </div>
            </div>
        </section>
    );
}
