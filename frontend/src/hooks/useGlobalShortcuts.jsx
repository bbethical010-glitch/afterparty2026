import { useEffect } from 'react';

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

export function useGlobalShortcuts(handlers) {
  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      const createPressed = event.altKey && key === 'c';
      if (createPressed && handlers.onCreate) {
        event.preventDefault();
        handlers.onCreate();
      }

      if (event.key === 'Escape' && handlers.onBack) {
        event.preventDefault();
        handlers.onBack();
      }

      const savePressed = !isTypingTarget(event.target) && event.key === 'Enter';
      if (savePressed && handlers.onSave) {
        event.preventDefault();
        handlers.onSave();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
