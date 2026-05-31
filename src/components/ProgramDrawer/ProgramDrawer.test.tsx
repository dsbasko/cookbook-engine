import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const gateRef = {
  current: {
    course: { modules: [] },
    progress: null,
    hydrated: false,
    furthestIndex: 0,
    basePath: '',
  },
};
vi.mock('@/components/GateProvider', () => ({
  useGate: () => gateRef.current,
}));

const progressModeRef = { current: { disabled: false } };
vi.mock('@/components/ProgressModeProvider', () => ({
  useProgressMode: () => progressModeRef.current,
}));

vi.mock('@/components/ProgressBar', () => ({
  ProgressBar: () => null,
}));

vi.mock('@/lib/use-i18n', () => ({
  useLang: () => 'en',
  // Return the key name for any label so the JSX renders deterministically.
  useT: () => new Proxy({}, { get: (_t, key) => String(key) }),
}));

vi.mock('@/lib/gate-mark-script', () => ({
  applyGatePainting: vi.fn(),
}));

vi.mock('@/lib/format', () => ({
  formatDurationShort: () => '5m',
  parseDurationMin: () => 5,
}));

vi.mock('@/lib/progress', () => ({
  isCompleted: () => false,
  lessonKey: (a: string, b: string) => `${a}/${b}`,
  markCompletedAndAdvance: vi.fn(),
}));

const { ProgramDrawer } = await import('./ProgramDrawer');
const { markCompletedAndAdvance } = await import('@/lib/progress');
const { applyGatePainting } = await import('@/lib/gate-mark-script');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  progressModeRef.current = { disabled: false };
  gateRef.current = {
    course: { modules: [] },
    progress: null,
    hydrated: false,
    furthestIndex: 0,
    basePath: '',
  };
  vi.mocked(markCompletedAndAdvance).mockClear();
  vi.mocked(applyGatePainting).mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

const NEXT = {
  moduleId: '01-foundations',
  lesson: { slug: '01-03-deep', title: 'Deep dive' },
} as never;

function render() {
  act(() => {
    root.render(
      <ProgramDrawer
        course={{ modules: [] } as never}
        currentModuleId="01-foundations"
        currentSlug="01-02-mid"
        isOpen
        onClose={() => {}}
        next={NEXT}
      />,
    );
  });
}

function clickNextCard() {
  const nextLink = container.querySelector(
    'a[aria-label="nextLessonAria"]',
  ) as HTMLAnchorElement;
  act(() => {
    nextLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ProgramDrawer next-lesson card', () => {
  it('records progress on click when progress mode is enabled', () => {
    render();
    clickNextCard();
    expect(markCompletedAndAdvance).toHaveBeenCalledTimes(1);
  });

  it('does not record progress on click in free-reading mode', () => {
    progressModeRef.current = { disabled: true };
    render();
    clickNextCard();
    expect(markCompletedAndAdvance).not.toHaveBeenCalled();
  });
});

describe('ProgramDrawer gate painting', () => {
  it('paints gate markers once hydrated when progress mode is enabled', () => {
    gateRef.current = { ...gateRef.current, hydrated: true };
    render();
    expect(applyGatePainting).toHaveBeenCalled();
  });

  it('does not paint gate markers in free-reading mode', () => {
    // With progress cleared, furthestIndex is -1; painting would re-lock every
    // row past index 0 and block navigation. The guard must skip it entirely.
    progressModeRef.current = { disabled: true };
    gateRef.current = { ...gateRef.current, hydrated: true, furthestIndex: -1 };
    render();
    expect(applyGatePainting).not.toHaveBeenCalled();
  });
});
