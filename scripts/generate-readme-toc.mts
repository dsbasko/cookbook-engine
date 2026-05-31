#!/usr/bin/env tsx
// Engine-side README TOC generator. Prints the markdown table of contents for
// the course root README. Resolves course data via process.cwd() (run it from
// the consumer's web/), imports engine lib by relative path under tsx.
import { loadCourse } from '../src/lib/course-loader.ts';
import { isLang, type Lang } from '../src/lib/lang.ts';
import { generateReadmeToc } from '../src/lib/readme-toc.ts';
import { resolveCourseYaml, resolveLecturesRoot } from './resolve-course-paths.mjs';

function parseLang(): Lang {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--lang='));
  if (!arg) return 'en';
  const value = arg.slice('--lang='.length);
  if (!isLang(value)) {
    console.error(`Invalid --lang value: ${value}. Expected 'ru' or 'en'.`);
    process.exit(2);
  }
  return value;
}

function main(): void {
  const lang = parseLang();
  const courseYaml = resolveCourseYaml();
  const lecturesRoot = resolveLecturesRoot();
  const course = loadCourse(lang, {
    filePath: courseYaml,
    lecturesRoot,
  });
  process.stdout.write(generateReadmeToc(course, { lang, lecturesRoot }));
}

main();
