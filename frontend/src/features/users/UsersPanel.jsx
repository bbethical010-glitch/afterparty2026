import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { useViewState } from '../../providers/ViewStateProvider';
import { useFocusList, useAutoFocus } from '../../lib/FocusManager';
import { useEffect, useRef, useState } from 'react';

/**
 * UsersPanel — list + create users. Arrow nav, Enter to view.
 */
export function UsersPanel() {
  const { user } = useAuth();
  const { popScreen } = useViewState();
  const businessId = user?.businessId;
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users', businessId],
    enabled: Boolean(businessId),
    queryFn: () => api.get('/auth/users'),
  });

  const { activeIndex, containerProps } = useFocusList(users.length, {
    onBack: () => popScreen(),
  });

  useAutoFocus(containerProps.ref);

  return (
    <section className="tally-panel">
      <div className="tally-panel-header">Users</div>
      <div {...containerProps}>
        <table className="w-full table-grid text-sm">
          <thead className="tally-table-header">
            <tr><th>Username</th><th>Display Name</th><th>Role</th></tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr
                key={u.id}
                data-focus-index={idx}
                className={idx === activeIndex ? 'tally-row-active' : ''}
              >
                <td>{u.username}</td>
                <td>{u.displayName}</td>
                <td>{u.role}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={3} className="text-center py-2 opacity-60">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="tally-status-bar">↑↓ Navigate · Esc Back</div>
    </section>
  );
}
