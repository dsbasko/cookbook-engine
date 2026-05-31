import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCourse, type Course } from './course';
import { type Lang } from './lang';
import { resolveCourseYaml, resolveLecturesRoot } from './paths';

export interface LoadCourseOptions {
  filePath?: string;
  lecturesRoot?: string;
}

export function loadCourse(lang: Lang, options: LoadCourseOptions = {}): Course {
  const filePath = options.filePath ?? resolveCourseYaml();
  const lecturesRoot = options.lecturesRoot ?? resolveLecturesRoot();
  const raw = readFileSync(filePath, 'utf8');
  const course = parseCourse(raw, lang, filePath);

  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const translationPath = path.join(
        lecturesRoot,
        mod.id,
        lesson.slug,
        'i18n',
        lang,
        'README.md',
      );
      lesson.hasTranslation = existsSync(translationPath);
    }
  }

  return course;
}
