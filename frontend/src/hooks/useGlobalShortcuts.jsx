import { useEffect } from 'react';

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

/**
 * useGlobalShortcuts — App-Shell level keyboard shortcuts.
 * Expanded with F1 (company), F2 (date), Ctrl+P (print), Alt+Left (back)
 */
export function useGlobalShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      if (handlers.disabled) return;
      if (event.defaultPrevented) return;
      const typing = isTypingTarget(event.target);
      const key = event.key.toLowerCase();

      // Ctrl/Cmd+K → Command Palette
      if ((event.metaKey || event.ctrlKey) && key === 'k' && handlers.onGoTo) {
        event.preventDefault();
        handlers.onGoTo();
        return;
      }

      // F1 → Select Company
      if (event.key === 'F1' && handlers.onCompany) {
        event.preventDefault();
        handlers.onCompany();
        return;
      }

      // F2 → Change Date
      if (event.key === 'F2' && handlers.onChangeDate) {
        event.preventDefault();
        handlers.onChangeDate();
        return;
      }

      // F12 → Configuration
      if (event.key === 'F12' && handlers.onConfigure) {
        event.preventDefault();
        handlers.onConfigure();
        return;
      }

      // Ctrl+P / Cmd+P → Print
      if ((event.metaKey || event.ctrlKey) && key === 'p' && handlers.onPrint) {
        event.preventDefault();
        handlers.onPrint();
        return;
      }

      // Alt+Left → Go back
      if (event.altKey && event.key === 'ArrowLeft' && handlers.onBack) {
        event.preventDefault();
        handlers.onBack();
        return;
      }

      // Alt+C / Alt+N → New Voucher
      const createPressed = !typing && event.altKey && (key === 'c' || key === 'n');
      if (createPressed && handlers.onCreate) {
        event.preventDefault();
        handlers.onCreate();
        return;
      }

      // Alt+U → Users
      if (!typing && event.altKey && key === 'u' && handlers.onUsers) {
        event.preventDefault();
        handlers.onUsers();
        return;
      }

      // Alt+P → Change Password
      if (!typing && event.altKey && key === 'p' && handlers.onPassword) {
        event.preventDefault();
        handlers.onPassword();
        return;
      }

      // Alt+G → Gateway
      if (!typing && event.altKey && key === 'g' && handlers.onGateway) {
        event.preventDefault();
        handlers.onGateway();
        return;
      }

      // Alt+M → Masters
      if (!typing && event.altKey && key === 'm' && handlers.onMasters) {
        event.preventDefault();
        handlers.onMasters();
        return;
      }

      // Alt+T → Transactions
      if (!typing && event.altKey && key === 't' && handlers.onTransactions) {
        event.preventDefault();
        handlers.onTransactions();
        return;
      }

      // Esc → Back
      if (!typing && event.key === 'Escape' && handlers.onBack) {
        event.preventDefault();
        handlers.onBack();
        return;
      }

      // Ctrl+S / Cmd+S → Save
      const savePressed = (event.metaKey || event.ctrlKey) && key === 's';
      if (savePressed && handlers.onSave) {
        event.preventDefault();
        handlers.onSave();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
