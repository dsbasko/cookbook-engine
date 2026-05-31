import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const clearProgress = vi.fn();
vi.mock('@/lib/progress', () => ({
  clearProgress: () => clearProgress(),
}));

const { ProgressModeProvider, useProgressMode } = await import('./ProgressModeProvider');
const { PROGRESS_DISABLED_STORAGE_KEY, PROGRESS_DISABLED_ATTR } = await import(
  '@/lib/progress-mode'
);

type Captured = ReturnType<typeof useProgressMode> | null;

function Capture({ into }: { into: { current: Captured } }) {
  into.current = useProgressMode();
  return null;
}

let container: HTMLDivElement;
let root: Root;

beforeAll(() => {
  if (typeof window.localStorage?.setItem !== 'function') {
    const store = new Map<string, string>();
    const shim: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: shim,
    });
  }
});

beforeEach(() => {
  clearProgress.mockClear();
  window.localStorage.clear();
  document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
});

function render(captured: { current: Captured }) {
  act(() => {
    root.render(
      <ProgressModeProvider>
        <Capture into={captured} />
      </ProgressModeProvider>,
    );
  });
}

describe('ProgressModeProvider', () => {
  it('seeds initial state from the <html> data-progress-disabled attribute', () => {
    document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
    const captured: { current: Captured } = { current: null };
    render(captured);
    expect(captured.current?.disabled).toBe(true);
  });

  it('defaults to enabled (disabled=false) when the attribute is absent', () => {
    const captured: { current: Captured } = { current: null };
    render(captured);
    expect(captured.current?.disabled).toBe(false);
  });

  it('setDisabled(true) writes storage, sets the attribute, and clears progress', () => {
    const captured: { current: Captured } = { current: null };
    render(captured);
    act(() => {
      captured.current?.setDisabled(true);
    });
    expect(captured.current?.disabled).toBe(true);
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBe('true');
    expect(window.localStorage.getItem(PROGRESS_DISABLED_STORAGE_KEY)).toBe('true');
    expect(clearProgress).toHaveBeenCalledTimes(1);
  });

  it('setDisabled(false) removes storage/attribute and does NOT clear progress', () => {
    document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    const captured: { current: Captured } = { current: null };
    render(captured);
    act(() => {
      captured.current?.setDisabled(false);
    });
    expect(captured.current?.disabled).toBe(false);
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBeNull();
    expect(window.localStorage.getItem(PROGRESS_DISABLED_STORAGE_KEY)).toBeNull();
    expect(clearProgress).not.toHaveBeenCalled();
  });

  it('ignores storage events for unrelated keys', () => {
    const captured: { current: Captured } = { current: null };
    render(captured);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'some-other-key', newValue: 'true' }),
      );
    });
    expect(captured.current?.disabled).toBe(false);
    expect(clearProgress).not.toHaveBeenCalled();
  });

  it('cross-tab storage event updates state and attribute without clearing progress', () => {
    const captured: { current: Captured } = { current: null };
    render(captured);
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: PROGRESS_DISABLED_STORAGE_KEY,
          newValue: 'true',
        }),
      );
    });
    expect(captured.current?.disabled).toBe(true);
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBe('true');
    expect(clearProgress).not.toHaveBeenCalled();
  });

  it('cross-tab clearing of the key re-enables progress in this tab', () => {
    document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    const captured: { current: Captured } = { current: null };
    render(captured);
    expect(captured.current?.disabled).toBe(true);
    window.localStorage.removeItem(PROGRESS_DISABLED_STORAGE_KEY);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: PROGRESS_DISABLED_STORAGE_KEY,
          newValue: null,
        }),
      );
    });
    expect(captured.current?.disabled).toBe(false);
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBeNull();
    expect(clearProgress).not.toHaveBeenCalled();
  });
});

describe('useProgressMode', () => {
  it('throws when used outside the provider', () => {
    const errors: unknown[] = [];
    function Probe() {
      try {
        useProgressMode();
      } catch (err) {
        errors.push(err);
      }
      return null;
    }
    const originalError = console.error;
    console.error = () => {};
    try {
      act(() => {
        root.render(<Probe />);
      });
    } finally {
      console.error = originalError;
    }
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toMatch(/ProgressModeProvider/);
  });
});
