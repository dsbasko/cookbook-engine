import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GATE_LOCKED_ATTR } from '@/lib/gate-init-script';
import { GATE_ITEM_KEY_ATTR, GATE_ITEM_LOCKED_ATTR } from '@/lib/gate-mark-script';
import { parseCourse, type Course } from '@/lib/course';
import { lessonKey } from '@/lib/progress';
import { PROGRESS_DISABLED_ATTR } from '@/lib/progress-mode';
import { ProgressModeProvider } from '@/components/ProgressModeProvider';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const pathnameRef: { current: string | null } = { current: '/' };

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

const { GateProvider, useGate } = await import('./GateProvider');

// applyGatePainting is the repaint path we must NOT take in free-reading mode.
// Spy on it to assert the disabled branch short-circuits before painting.
const gateMark = await import('@/lib/gate-mark-script');
const paintSpy = vi.spyOn(gateMark, 'applyGatePainting');

const COURSE_YAML = `
title: Test
description: Test
basePath: /test
repoUrl: https://example.com/test
modules:
  - id: 01-foo
    title: Foo
    description: D
    lessons:
      - slug: 01-01-intro
        title: Intro
        duration: 30m
      - slug: 01-02-deep
        title: Deep
        duration: 45m
  - id: 02-bar
    title: Bar
    description: D
    lessons:
      - slug: 02-01-start
        title: Start
        duration: 20m
      - slug: 02-02-end
        title: End
        duration: 20m
`;

function loadCourse(): Course {
  return parseCourse(COURSE_YAML);
}

let container: HTMLDivElement;
let root: Root;

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

beforeEach(() => {
  window.localStorage.clear();
  pathnameRef.current = '/';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  document.documentElement.removeAttribute(GATE_LOCKED_ATTR);
  document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  paintSpy.mockClear();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.documentElement.removeAttribute(GATE_LOCKED_ATTR);
  document.documentElement.removeAttribute(PROGRESS_DISABLED_ATTR);
  // Drop any stray lesson rows created for residual-marker tests.
  document
    .querySelectorAll(`[${GATE_ITEM_KEY_ATTR}]`)
    .forEach((el) => el.remove());
});

const gateRef: { current: ReturnType<typeof useGate> | null } = { current: null };

function Probe() {
  gateRef.current = useGate();
  return null;
}

function renderGate(course: Course) {
  act(() => {
    root.render(
      <ProgressModeProvider>
        <GateProvider course={course} basePath="">
          <Probe />
        </GateProvider>
      </ProgressModeProvider>,
    );
  });
}

/** Enables free-reading mode the way the inline init script would, before render. */
function enableFreeReading() {
  document.documentElement.setAttribute(PROGRESS_DISABLED_ATTR, 'true');
}

describe('GateProvider gate-locked attribute', () => {
  it('does not lock on the home pathname', () => {
    pathnameRef.current = '/';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });

  it('does not lock for the first reachable lesson at /moduleId/slug', () => {
    pathnameRef.current = '/01-foo/01-01-intro';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });

  it('locks a future lesson at /moduleId/slug', () => {
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.getAttribute(GATE_LOCKED_ATTR)).toBe('true');
  });

  it('locks a future lesson under /ru/ prefix', () => {
    pathnameRef.current = '/ru/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.getAttribute(GATE_LOCKED_ATTR)).toBe('true');
  });

  it('locks a future lesson under /en/ prefix', () => {
    pathnameRef.current = '/en/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.getAttribute(GATE_LOCKED_ATTR)).toBe('true');
  });

  it('does not lock the first lesson under /ru/ prefix', () => {
    pathnameRef.current = '/ru/01-foo/01-01-intro';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });

  it('does not lock when stripped pathname has fewer than 2 segments', () => {
    pathnameRef.current = '/ru/';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });

  it('respects furthest pointer for /en/ paths when localStorage marks progress', () => {
    window.localStorage.setItem(
      'kafka-cookbook-furthest',
      lessonKey('02-bar', '02-01-start'),
    );
    pathnameRef.current = '/en/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });
});

describe('GateProvider free-reading mode', () => {
  it('reports every lesson as unlocked, including future ones', () => {
    enableFreeReading();
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(gateRef.current?.isLessonUnlocked('02-bar', '02-02-end')).toBe(true);
    expect(gateRef.current?.isLessonUnlocked('01-foo', '01-01-intro')).toBe(true);
  });

  it('removes the page-level lock for a would-be-locked lesson', () => {
    enableFreeReading();
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.hasAttribute(GATE_LOCKED_ATTR)).toBe(false);
  });

  it('strips residual data-locked markers and never repaints', () => {
    // Simulate a row that gate-mark already locked before the flag flipped.
    const stale = document.createElement('a');
    stale.setAttribute(GATE_ITEM_KEY_ATTR, lessonKey('02-bar', '02-02-end'));
    stale.setAttribute(GATE_ITEM_LOCKED_ATTR, 'true');
    stale.setAttribute('aria-disabled', 'true');
    stale.setAttribute('tabindex', '-1');
    document.body.appendChild(stale);

    enableFreeReading();
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());

    expect(stale.hasAttribute(GATE_ITEM_LOCKED_ATTR)).toBe(false);
    expect(stale.hasAttribute('aria-disabled')).toBe(false);
    expect(stale.hasAttribute('tabindex')).toBe(false);
    expect(paintSpy).not.toHaveBeenCalled();
  });

  it('strips residual completion markers (data-completed/data-next)', () => {
    // Simulate a row gate-mark painted as completed before the flag flipped.
    // The CSS hide-list doesn't cover `[data-completed]`, so leaving it on
    // would keep "done" styling visible after progress was reset.
    const done = document.createElement('a');
    done.setAttribute(GATE_ITEM_KEY_ATTR, lessonKey('01-foo', '01-01-intro'));
    done.setAttribute('data-completed', 'true');
    done.setAttribute('data-next', 'true');
    document.body.appendChild(done);

    enableFreeReading();
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());

    expect(done.hasAttribute('data-completed')).toBe(false);
    expect(done.hasAttribute('data-next')).toBe(false);
    expect(paintSpy).not.toHaveBeenCalled();
  });

  it('resets stale CTA-frontier state and clears data-has-progress', () => {
    // CTA rows are intentionally not hidden by the free-reading CSS; gate-mark
    // may have painted a "continue/reread" variant before the flag flipped.
    const cta = document.createElement('div');
    cta.setAttribute('data-cta-frontier', 'global');
    cta.setAttribute('data-cta-state', 'in-progress');
    document.body.appendChild(cta);
    document.documentElement.setAttribute('data-has-progress', 'true');

    enableFreeReading();
    pathnameRef.current = '/';
    renderGate(loadCourse());

    expect(cta.getAttribute('data-cta-state')).toBe('not-started');
    expect(document.documentElement.hasAttribute('data-has-progress')).toBe(false);
    expect(paintSpy).not.toHaveBeenCalled();

    cta.remove();
  });

  it('keeps normal gating when free-reading is disabled (regression)', () => {
    pathnameRef.current = '/02-bar/02-02-end';
    renderGate(loadCourse());
    expect(document.documentElement.getAttribute(GATE_LOCKED_ATTR)).toBe('true');
    expect(gateRef.current?.isLessonUnlocked('02-bar', '02-02-end')).toBe(false);
    expect(paintSpy).toHaveBeenCalled();
  });
});
