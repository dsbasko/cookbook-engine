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

const progressModeRef = { current: { disabled: false } };
vi.mock('@/components/ProgressModeProvider', () => ({
  useProgressMode: () => progressModeRef.current,
}));

vi.mock('@/lib/progress', () => ({
  lessonKey: (a: string, b: string) => `${a}/${b}`,
  PROGRESS_CHANGE_EVENT: 'kafka-cookbook-progress-change',
  unmarkCompleted: vi.fn(),
}));

const { LessonSideMeta } = await import('./LessonSideMeta');
const { unmarkCompleted } = await import('@/lib/progress');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  paramsRef.current = { lang: 'en' };
  progressModeRef.current = { disabled: false };
  vi.mocked(unmarkCompleted).mockClear();
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

function render() {
  act(() => {
    root.render(
      <LessonSideMeta
        moduleId="01-foundations"
        moduleTitle="Foundations"
        moduleIndex={1}
        slug="01-02-mid"
        duration="10 min"
        tags={['kafka']}
      />,
    );
  });
}

function clickUnmark() {
  const button = container.querySelector(
    '[data-show-when-completed]',
  ) as HTMLButtonElement;
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('LessonSideMeta', () => {
  it('unmarks the lesson when progress mode is enabled', () => {
    render();
    clickUnmark();
    expect(unmarkCompleted).toHaveBeenCalledTimes(1);
  });

  it('does not touch progress storage in free-reading mode', () => {
    progressModeRef.current = { disabled: true };
    render();
    clickUnmark();
    expect(unmarkCompleted).not.toHaveBeenCalled();
  });
});
