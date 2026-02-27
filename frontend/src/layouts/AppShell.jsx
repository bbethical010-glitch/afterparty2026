import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

import { CommandPalette } from '../components/CommandPalette';
import { DatePickerModal } from '../components/DatePickerModal';
import { getCommandCatalog } from '../lib/navigation';
import { useAuth } from '../auth/AuthContext';

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const canManageUsers = user?.role === 'OWNER';
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [workingDate, setWorkingDate] = useState(new Date().toISOString().slice(0, 10));
  const mainRef = useRef(null);

  const commands = useMemo(() => {
    const catalog = getCommandCatalog(canManageUsers);
    return [
      ...catalog,
      {
        id: 'company-setup',
        label: 'Company Setup',
        path: '/company-setup',
        section: 'Masters',
        hotkey: 'Y',
        keywords: ['company', 'business', 'fy', 'financial year']
      },
      {
        id: 'ledger-create',
        label: 'Create Ledger',
        path: '/ledger/new',
        section: 'Masters',
        hotkey: 'L',
        keywords: ['create', 'ledger', 'account', 'new ledger']
      },
      {
        id: 'logout',
        label: 'Logout',
        path: '/login',
        section: 'Session',
        hotkey: 'Q',
        keywords: ['sign out', 'exit']
      }
    ];
  }, [canManageUsers]);

  function navigateFromPalette(path) {
    setIsPaletteOpen(false);
    if (path === '/login') {
      logout();
      navigate('/login');
      return;
    }
    navigate(path);
  }

  // Global shortcuts have been removed in favor of FocusGraph and ListEngine

  useEffect(() => {
    if (isPaletteOpen || isDatePickerOpen) return;
    requestAnimationFrame(() => mainRef.current?.focus());
  }, [location.pathname, isPaletteOpen, isDatePickerOpen]);

  return (
    <div className="min-h-screen bg-tally-background text-tally-text">
      {/* Working date badge in top bar context */}
      <TopBar
        onOpenGoTo={() => setIsPaletteOpen(true)}
        workingDate={workingDate}
        onOpenDatePicker={() => setIsDatePickerOpen(true)}
      />
      <main ref={mainRef} tabIndex={-1} className="p-2 md:p-3 focus:outline-none">
        <Outlet />
      </main>
      <CommandPalette
        open={isPaletteOpen}
        commands={commands}
        onClose={() => setIsPaletteOpen(false)}
        onNavigate={navigateFromPalette}
      />
      <DatePickerModal
        open={isDatePickerOpen}
        currentDate={workingDate}
        onClose={() => setIsDatePickerOpen(false)}
        onDateChange={(date) => {
          setWorkingDate(date);
          setIsDatePickerOpen(false);
        }}
      />
    </div>
  );
}
