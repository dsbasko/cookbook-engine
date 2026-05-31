import { describe, expect, it, vi } from 'vitest';
import type { Course, Lesson, Module } from '@/lib/course';

// generateStaticParams across pages/layouts is the one piece of pure routing
// logic worth pinning: it fans the course tree out into the (lang × …) tuples
// Next emits at `output: 'export'`. Mock the loader so the cross-products are
// deterministic and independent of the on-disk course.yaml.

function makeLesson(slug: string): Lesson {
  return { slug, title: slug, duration: '30m', tags: [], hasTranslation: true };
}

function makeModule(id: string, lessons: Lesson[]): Module {
  return { id, title: id, description: `${id} desc`, lessons };
}

const FIXTURE: Course = {
  title: 'Test',
  description: 'Test desc',
  basePath: '/test',
  repoUrl: 'https://example.com/test',
  modules: [
    makeModule('01-foo', [makeLesson('01-01-intro'), makeLesson('01-02-deep')]),
    makeModule('02-bar', [makeLesson('02-01-start')]),
  ],
};

vi.mock('@/lib/course-loader', () => ({
  loadCourse: () => FIXTURE,
}));

describe('home.generateStaticParams', () => {
  it('emits one entry per language', async () => {
    const { generateStaticParams } = await import('./home');
    expect(generateStaticParams()).toEqual([{ lang: 'ru' }, { lang: 'en' }]);
  });
});

describe('lang layout.generateStaticParams', () => {
  it('emits one entry per language', async () => {
    const { generateStaticParams } = await import('../layout/lang');
    expect(generateStaticParams()).toEqual([{ lang: 'ru' }, { lang: 'en' }]);
  });
});

describe('module.generateStaticParams', () => {
  it('fans every module id across both languages', () => {
    return import('./module').then(({ generateStaticParams }) => {
      const params = generateStaticParams();
      expect(params).toEqual([
        { lang: 'ru', module: '01-foo' },
        { lang: 'ru', module: '02-bar' },
        { lang: 'en', module: '01-foo' },
        { lang: 'en', module: '02-bar' },
      ]);
    });
  });
});

describe('lesson.generateStaticParams', () => {
  it('fans every (module, lesson) pair across both languages', async () => {
    const { generateStaticParams } = await import('./lesson');
    const params = generateStaticParams();
    // 3 lessons × 2 langs = 6 triples.
    expect(params).toHaveLength(6);
    expect(params).toContainEqual({
      lang: 'ru',
      module: '01-foo',
      lesson: '01-01-intro',
    });
    expect(params).toContainEqual({
      lang: 'en',
      module: '02-bar',
      lesson: '02-01-start',
    });
    // every triple carries a valid lang
    expect(params.every((p) => p.lang === 'ru' || p.lang === 'en')).toBe(true);
  });
});
