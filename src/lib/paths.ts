import { existsSync } from 'node:fs';
import path from 'node:path';

// Shared CWD-based resolution for the consumer's course.yaml / lectures dir.
//
// The engine ships inside the consumer's node_modules, so __dirname /
// import.meta.url point into node_modules and must never be used to locate
// course data. Resolve from process.cwd() instead: builds, vitest and the CLI
// helpers all run with CWD=web/ (course data one level up), while coverage/TOC
// tooling may run with CWD=repo-root (course data alongside). Probe `./` before
// `../` so a stray manifest in the parent of the repo never wins over the one
// inside the repo when run from the repo root.
//
// `lesson.ts` and `course-loader.ts` both call these so their candidate lists
// can never drift apart. Evaluated lazily (per call) — never as a module-load
// constant — so the CWD in effect at call time is honoured.
function firstExisting(candidates: string[]): string {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function resolveCourseYaml(): string {
  return firstExisting([
    path.resolve(process.cwd(), 'course.yaml'), // CWD=repo root
    path.resolve(process.cwd(), '..', 'course.yaml'), // CWD=web/
  ]);
}

export function resolveLecturesRoot(): string {
  return firstExisting([
    path.resolve(process.cwd(), 'lectures'), // CWD=repo root
    path.resolve(process.cwd(), '..', 'lectures'), // CWD=web/
  ]);
}
