import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const paramsRef: { current: Record<string, string | string[] | undefined> | null } = {
  current: { lang: 'en' },
};

vi.mock('next/navigation', () => ({
  useParams: () => paramsRef.current,
}));

vi.mock('@/components/GateProvider', () => ({
  useGate: () => ({
    course: { modules: [] },
    progress: null,
    hydrated: false,
    furthestIndex: 0,
    basePath: '',
  }),
}));

const progressModeRef = { current: { disabled: false } };
vi.mock('@/components/ProgressModeProvider', () => ({
  useProgressMode: () => progressModeRef.current,
}));

vi.mock('@/lib/progress', () => ({
  lessonKey: (a: string, b: string) => `${a}/${b}`,
  markCompletedAndAdvance: vi.fn(),
}));

const { HeaderLessonNav } = await import('./HeaderLessonNav');
const { markCompletedAndAdvance } = await import('@/lib/progress');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  paramsRef.current = { lang: 'en' };
  progressModeRef.current = { disabled: false };
  vi.mocked(markCompletedAndAdvance).mockClear();
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

const PREV = {
  moduleId: '01-foundations',
  lesson: { slug: '01-01-intro', title: 'Intro' },
} as never;
const NEXT = {
  moduleId: '01-foundations',
  lesson: { slug: '01-03-deep', title: 'Deep dive' },
} as never;

function render(prev: typeof PREV | null, next: typeof NEXT | null) {
  act(() => {
    root.render(
      <HeaderLessonNav
        prev={prev}
        next={next}
        currentModuleId="01-foundations"
        currentSlug="01-02-mid"
      />,
    );
  });
}

function clickNext() {
  // The "next" chevron is the second anchor when both prev and next exist.
  const links = container.querySelectorAll('a');
  const nextLink = links[links.length - 1] as HTMLAnchorElement;
  act(() => {
    nextLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('HeaderLessonNav', () => {
  it('records progress on chevron click when progress mode is enabled', () => {
    render(PREV, NEXT);
    clickNext();
    expect(markCompletedAndAdvance).toHaveBeenCalledTimes(1);
  });

  it('does not record progress on chevron click in free-reading mode', () => {
    progressModeRef.current = { disabled: true };
    render(PREV, NEXT);
    clickNext();
    expect(markCompletedAndAdvance).not.toHaveBeenCalled();
  });
});
