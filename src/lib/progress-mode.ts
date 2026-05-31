export const PROGRESS_DISABLED_STORAGE_KEY = 'kafka-cookbook-progress-disabled';
export const PROGRESS_DISABLED_ATTR = 'data-progress-disabled';

/**
 * Reads the persisted "free reading" flag. The value is stored raw (as in
 * `theme.ts`): the literal string `'true'` means progress is disabled; the
 * absence of the key — or any other value — means progress is enabled
 * (the backwards-compatible default). Returns `false` on any failure so the
 * course keeps its normal gated behaviour when storage is unavailable.
 */
export function readProgressDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PROGRESS_DISABLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the flag. Writes the literal `'true'` when disabling progress and
 * removes the key entirely when re-enabling it, so the default state leaves no
 * trace in storage.
 */
export function writeProgressDisabled(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(PROGRESS_DISABLED_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(PROGRESS_DISABLED_STORAGE_KEY);
    }
  } catch {
    /* storage may be unavailable (private mode, quota); ignore. */
  }
}

/**
 * Sets/removes `data-progress-disabled` on <html>. When disabled the value
 * matches the stored value (`'true'`); when enabled the attribute is removed.
 */
export function applyProgressDisabled(value: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (value) {
    root.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
  } else {
    root.removeAttribute(PROGRESS_DISABLED_ATTR);
  }
}

/**
 * Inline script string injected into <head> before hydration — and crucially
 * before the gate-init script. Reads the stored flag and sets/removes
 * `data-progress-disabled` on <html> synchronously, so a previously-locked
 * lesson never flashes its locked interstitial in free-reading mode (FOUC-free).
 */
export const PROGRESS_MODE_INIT_SCRIPT = `(() => {
  try {
    var key = ${JSON.stringify(PROGRESS_DISABLED_STORAGE_KEY)};
    var stored = null;
    try { stored = window.localStorage.getItem(key); } catch (_) {}
    if (stored === 'true') {
      document.documentElement.setAttribute(${JSON.stringify(PROGRESS_DISABLED_ATTR)}, 'true');
    } else {
      document.documentElement.removeAttribute(${JSON.stringify(PROGRESS_DISABLED_ATTR)});
    }
  } catch (_) {}
})();`;
