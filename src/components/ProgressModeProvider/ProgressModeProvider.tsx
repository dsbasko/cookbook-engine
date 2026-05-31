'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  applyProgressDisabled,
  PROGRESS_DISABLED_ATTR,
  PROGRESS_DISABLED_STORAGE_KEY,
  readProgressDisabled,
  writeProgressDisabled,
} from '@/lib/progress-mode';
import { clearProgress } from '@/lib/progress';

type ProgressModeContextValue = {
  disabled: boolean;
  setDisabled: (value: boolean) => void;
};

const ProgressModeContext = createContext<ProgressModeContextValue | null>(null);

/**
 * Reads the current flag from the <html> attribute set synchronously by the
 * inline init script. Unlike ThemeProvider's lazy default-then-sync approach we
 * seed straight from the attribute so a previously-locked lesson opened in
 * free-reading mode never flashes its locked interstitial during hydration.
 */
function readFromHtml(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR) === 'true';
}

export function ProgressModeProvider({ children }: { children: ReactNode }) {
  const [disabled, setState] = useState<boolean>(readFromHtml);

  useEffect(() => {
    // Re-sync once mounted in case SSR seeded `false` before the attribute was
    // observable (e.g. lazy hydration); keeps state aligned with <html>.
    setState(readFromHtml());
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== PROGRESS_DISABLED_STORAGE_KEY) return;
      // Cross-tab sync only: mirror the flag and the attribute. We deliberately
      // do NOT call clearProgress here — the reset already happened in the tab
      // that flipped the toggle, so re-running it would double-clear.
      const next = readProgressDisabled();
      applyProgressDisabled(next);
      setState(next);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setDisabled = useCallback((value: boolean) => {
    // Order matters: flip `disabled` (attribute + storage + state) BEFORE
    // clearing progress. clearProgress dispatches PROGRESS_CHANGE_EVENT, which
    // GateProvider handles via refresh(); by then `disabled` is already true so
    // the effect takes the cleanup branch instead of repainting (no flash).
    applyProgressDisabled(value);
    writeProgressDisabled(value);
    setState(value);
    if (value) {
      clearProgress();
    }
  }, []);

  return (
    <ProgressModeContext.Provider value={{ disabled, setDisabled }}>
      {children}
    </ProgressModeContext.Provider>
  );
}

export function useProgressMode(): ProgressModeContextValue {
  const ctx = useContext(ProgressModeContext);
  if (!ctx) {
    throw new Error('useProgressMode must be used inside <ProgressModeProvider>');
  }
  return ctx;
}
