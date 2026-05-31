import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  applyProgressDisabled,
  PROGRESS_DISABLED_ATTR,
  PROGRESS_DISABLED_STORAGE_KEY,
  PROGRESS_MODE_INIT_SCRIPT,
  readProgressDisabled,
  writeProgressDisabled,
} from './progress-mode';

// jsdom in this project ships without a working Storage implementation,
// so install a minimal in-memory shim shared across the test file.
beforeAll(() => {
  if (typeof window.localStorage?.setItem === 'function') return;
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
});

describe('readProgressDisabled', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to false when nothing is stored', () => {
    expect(readProgressDisabled()).toBe(false);
  });

  it('returns true only for the literal "true"', () => {
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    expect(readProgressDisabled()).toBe(true);
  });

  it('returns false for garbage or any other value', () => {
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'TRUE');
    expect(readProgressDisabled()).toBe(false);
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, '1');
    expect(readProgressDisabled()).toBe(false);
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'false');
    expect(readProgressDisabled()).toBe(false);
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'yes');
    expect(readProgressDisabled()).toBe(false);
  });

  it('returns false when localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(readProgressDisabled()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});

describe('writeProgressDisabled', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('writes "true" when disabling progress', () => {
    writeProgressDisabled(true);
    expect(window.localStorage.getItem(PROGRESS_DISABLED_STORAGE_KEY)).toBe('true');
  });

  it('removes the key when enabling progress', () => {
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    writeProgressDisabled(false);
    expect(window.localStorage.getItem(PROGRESS_DISABLED_STORAGE_KEY)).toBe(null);
  });

  it('round-trips through readProgressDisabled', () => {
    writeProgressDisabled(true);
    expect(readProgressDisabled()).toBe(true);
    writeProgressDisabled(false);
    expect(readProgressDisabled()).toBe(false);
  });

  it('swallows errors when localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(() => writeProgressDisabled(true)).not.toThrow();
      expect(() => writeProgressDisabled(false)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });
});

describe('applyProgressDisabled', () => {
  afterEach(() => {
    document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  });

  it('sets the attribute to "true" when disabled', () => {
    applyProgressDisabled(true);
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBe('true');
  });

  it('removes the attribute when enabled', () => {
    document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
    applyProgressDisabled(false);
    expect(document.documentElement.hasAttribute(PROGRESS_DISABLED_ATTR)).toBe(false);
  });
});

describe('PROGRESS_MODE_INIT_SCRIPT', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  });

  afterEach(() => {
    document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  });

  it('sets the attribute when "true" is stored', () => {
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    new Function(PROGRESS_MODE_INIT_SCRIPT)();
    expect(document.documentElement.getAttribute(PROGRESS_DISABLED_ATTR)).toBe('true');
  });

  it('does not set the attribute when nothing is stored', () => {
    new Function(PROGRESS_MODE_INIT_SCRIPT)();
    expect(document.documentElement.hasAttribute(PROGRESS_DISABLED_ATTR)).toBe(false);
  });

  it('removes a stale attribute when stored value is not "true"', () => {
    document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
    window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'false');
    new Function(PROGRESS_MODE_INIT_SCRIPT)();
    expect(document.documentElement.hasAttribute(PROGRESS_DISABLED_ATTR)).toBe(false);
  });
});
