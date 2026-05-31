'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { Course, FlatLessonEntry } from '@/lib/course';
import { GATE_LOCKED_ATTR } from '@/lib/gate-init-script';
import {
  applyGatePainting,
  GATE_ITEM_KEY_ATTR,
  GATE_ITEM_LOCKED_ATTR,
} from '@/lib/gate-mark-script';
import { DEFAULT_LANG, stripLangFromPath } from '@/lib/lang';
import { useProgressMode } from '@/components/ProgressModeProvider';
import {
  getFrontierLesson,
  isLessonKeyUnlocked,
  resolveFurthestIndex,
} from '@/lib/lesson-gate';
import {
  FURTHEST_STORAGE_KEY,
  getFurthestKey,
  getProgress,
  PROGRESS_CHANGE_EVENT,
  PROGRESS_STORAGE_KEY,
  type LessonKey,
  type ProgressMap,
} from '@/lib/progress';

export type GateContextValue = {
  course: Course;
  basePath: string;
  hydrated: boolean;
  progress: ProgressMap;
  furthestKey: LessonKey | null;
  furthestIndex: number;
  isLessonUnlocked(moduleId: string, slug: string): boolean;
  getFrontier(): FlatLessonEntry | null;
};

export const GateContext = createContext<GateContextValue | null>(null);

type GateProviderProps = {
  course: Course;
  basePath: string;
  children: ReactNode;
};

export function GateProvider({ course, basePath, children }: GateProviderProps) {
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [furthestKey, setFurthestKeyState] = useState<LessonKey | null>(null);
  const pathname = usePathname();
  const { disabled } = useProgressMode();

  useEffect(() => {
    setProgress(getProgress());
    setFurthestKeyState(getFurthestKey());
    setHydrated(true);

    function refresh() {
      setProgress(getProgress());
      setFurthestKeyState(getFurthestKey());
    }
    function syncStorage(e: StorageEvent) {
      if (e.key !== PROGRESS_STORAGE_KEY && e.key !== FURTHEST_STORAGE_KEY) return;
      refresh();
    }
    window.addEventListener(PROGRESS_CHANGE_EVENT, refresh);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener(PROGRESS_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);

  // The inline LANG_SYNC_SCRIPT in [lang]/layout fixes <html lang> for the
  // very first paint, but client navigation between sibling /ru/ and /en/
  // routes only re-renders the script element — browsers do not execute
  // <script> tags inserted via DOM mutation, so the static `<html lang>`
  // from the root layout would stay wrong for screen readers and Intl APIs
  // after a language switch. Mirror the route lang from a client effect.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const { lang } = stripLangFromPath(pathname ?? '/');
    document.documentElement.lang = lang ?? DEFAULT_LANG;
  }, [pathname]);

  // Keep gate markers in sync with current state. Two attributes are
  // managed here from a single source of truth (resolveFurthestIndex):
  //   • `data-lesson-locked` on <html> — controls the lesson page gate.
  //     The inline init script handles the very first paint on direct
  //     navigation; this effect covers SPA route changes and cross-tab
  //     localStorage updates.
  //   • `data-locked` on every `[data-lesson-key]` element — controls
  //     locked styling in lists (HomePage modules, ModulePage lessons,
  //     ProgramDrawer, MDX cross-lesson links). The inline gate-mark
  //     script sets these before first paint; this effect re-applies them
  //     after React updates the DOM (e.g. drawer opening, route change
  //     introducing new rows, cross-tab progress sync).
  useEffect(() => {
    if (!hydrated) return;
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // Free-reading mode: every lesson is reachable, so there is nothing to
    // gate. Drop the page-level lock and skip painting entirely. We must also
    // actively strip any residual markers gate-mark may have painted before the
    // flag flipped (e.g. cross-tab sync or a route change). Besides the lock
    // markers (whose styling the CSS hide-list doesn't cover for MDX cross-
    // lesson links or ProgramDrawer rows), we also clear the completion markers
    // `data-completed`/`data-next`: progress was just reset, and the CSS hide-
    // list doesn't cover `[data-completed]`, so the "done" affordances
    // (checkmark, strikethrough, ModulePage dimming, the "mark unread" button)
    // would otherwise linger on already-painted rows.
    if (disabled) {
      root.removeAttribute(GATE_LOCKED_ATTR);
      // `data-has-progress` is stamped on <html> by gate-mark; clear it so no
      // residual progress-state lingers on the document root.
      root.removeAttribute('data-has-progress');
      document
        .querySelectorAll<HTMLElement>(`[${GATE_ITEM_KEY_ATTR}]`)
        .forEach((el) => {
          el.removeAttribute(GATE_ITEM_LOCKED_ATTR);
          el.removeAttribute('data-completed');
          el.removeAttribute('data-next');
          el.removeAttribute('aria-disabled');
          el.removeAttribute('tabindex');
        });
      // CTA frontier rows are intentionally NOT hidden by the free-reading CSS
      // (the plain "start" variant must stay visible). But gate-mark may have
      // already painted `data-cta-state="in-progress"/"complete"` before the
      // flag flipped (in-tab toggle or cross-tab sync), and nothing else resets
      // it — so reset them to the SSR baseline so the right CTA variant shows
      // without a reload.
      document
        .querySelectorAll<HTMLElement>('[data-cta-frontier]')
        .forEach((el) => {
          el.setAttribute('data-cta-state', 'not-started');
        });
      return;
    }

    const furthestIndex = resolveFurthestIndex(course, furthestKey, progress);

    const { lang: parsedLang, rest } = stripLangFromPath(pathname ?? '/');
    const segments = rest
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);
    if (segments.length < 2) {
      root.removeAttribute(GATE_LOCKED_ATTR);
    } else {
      const [moduleId, slug] = segments;
      const locked = !isLessonKeyUnlocked(course, moduleId, slug, furthestKey, progress);
      if (locked) {
        root.setAttribute(GATE_LOCKED_ATTR, 'true');
      } else {
        root.removeAttribute(GATE_LOCKED_ATTR);
      }
    }

    applyGatePainting(course, furthestIndex, basePath, parsedLang ?? DEFAULT_LANG);
  }, [hydrated, pathname, course, basePath, furthestKey, progress, disabled]);

  const value = useMemo<GateContextValue>(() => {
    const furthestIndex = resolveFurthestIndex(course, furthestKey, progress);
    return {
      course,
      basePath,
      hydrated,
      progress,
      furthestKey,
      furthestIndex,
      isLessonUnlocked(moduleId, slug) {
        // Free-reading mode unlocks everything. Checked before `!hydrated`
        // because `disabled` is seeded synchronously from the <html> attribute,
        // so it is already correct during SSR/pre-hydration.
        if (disabled) return true;
        // Pre-hydration we cannot know what the user has unlocked — render
        // everything as reachable so SSR matches and the user never sees a
        // flash of locked items that immediately unlock on hydration.
        if (!hydrated) return true;
        return isLessonKeyUnlocked(course, moduleId, slug, furthestKey, progress);
      },
      getFrontier() {
        return getFrontierLesson(course, furthestIndex);
      },
    };
  }, [course, basePath, hydrated, progress, furthestKey, disabled]);

  return <GateContext.Provider value={value}>{children}</GateContext.Provider>;
}

export function useGate(): GateContextValue {
  const value = useContext(GateContext);
  if (!value) {
    throw new Error('useGate must be used within <GateProvider>');
  }
  return value;
}
