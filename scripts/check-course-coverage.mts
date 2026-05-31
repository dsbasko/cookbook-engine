#!/usr/bin/env tsx
// Engine-side coverage check. Verifies course.yaml ↔ lectures/ parity plus
// RU/EN translation coverage. Resolves course data via process.cwd() (run it
// from the consumer's web/), and imports the engine's lib by relative path so
// it works straight off the package source under tsx.
import {
  buildCoverageReport,
  formatCoverageReport,
  isCoverageFailing,
} from '../src/lib/coverage.ts';
import { loadCourse } from '../src/lib/course-loader.ts';
import { resolveCourseYaml, resolveLecturesRoot } from './resolve-course-paths.mjs';

function main(): void {
  const courseYaml = resolveCourseYaml();
  const lecturesRoot = resolveLecturesRoot();
  const course = loadCourse('ru', {
    filePath: courseYaml,
    lecturesRoot,
  });
  const report = buildCoverageReport(course, lecturesRoot);
  const formatted = formatCoverageReport(report);

  for (const line of formatted.ok) console.log(line);
  for (const line of formatted.translationGaps) console.log(line);
  for (const line of formatted.mismatches) console.error(line);
  console.error(`\n${formatted.summary}`);

  process.exit(isCoverageFailing(report) ? 1 : 0);
}

main();
