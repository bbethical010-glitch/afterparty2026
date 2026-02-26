import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getRouteLabel } from '../lib/navigation';

export function TopBar({ onOpenGoTo, workingDate, onOpenDatePicker }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageUsers = user?.role === 'OWNER';
  const routeLabel = getRouteLabel(location.pathname);

  function onLogout() {
    logout();
    navigate('/login');
  }

  const displayDate = workingDate
    ? new Date(workingDate + 'T00:00:00').toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
    : '—';

  return (
    <header className="bg-tally-header text-white border-b border-tally-panelBorder px-3 py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-sm md:text-base font-semibold tracking-wide truncate">
          Gateway of Tally — Accounting ERP
        </h1>
        <p className="text-[11px] md:text-xs opacity-90 truncate">Gateway › {routeLabel}</p>
      </div>

      <div className="flex items-center gap-2 text-[11px] md:text-xs flex-wrap justify-end">
        {/* F2 — Working Date */}
        <button
          type="button"
          className="focusable border border-white/40 px-2 py-1 flex items-center gap-1"
          onClick={onOpenDatePicker}
          title="Change Date (F2)"
        >
          <span className="opacity-60">F2</span>
          <span>{displayDate}</span>
        </button>

        {/* Shortcut hints */}
        <span className="hidden lg:inline opacity-70">
          ⌘K GoTo · F1 Co · F2 Date · Ctrl+P Print · Esc Back
        </span>

        <span className="opacity-90 font-semibold">{user?.displayName || user?.username}</span>

        <button
          type="button"
          className="focusable border border-white/40 px-2 py-1"
          onClick={onOpenGoTo}
        >
          GoTo (⌘K)
        </button>

        <button
          type="button"
          className="focusable border border-white/40 px-2 py-1"
          onClick={() => navigate('/company-setup')}
        >
          F1 Co.
        </button>

        {canManageUsers && (
          <button
            type="button"
            className="focusable border border-white/40 px-2 py-1"
            onClick={() => navigate('/users')}
          >
            Users
          </button>
        )}

        <button
          type="button"
          className="focusable border border-white/40 px-2 py-1"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
