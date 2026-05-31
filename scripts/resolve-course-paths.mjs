// Shared cwd-based resolver for the engine CLI helpers. Mirrors the candidate
// lists in lib/course-loader.ts: probe CWD=repo-root (`./course.yaml`,
// `./lectures`) first, then CWD=web/ (`../course.yaml`, `../lectures`). NEVER
// resolves via import.meta.url — the package lives in node_modules, so the
// course data must always come from the consumer's process.cwd().
import { existsSync } from 'node:fs';
import path from 'node:path';

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function resolveCourseYaml() {
  return firstExisting([
    path.resolve(process.cwd(), 'course.yaml'),
    path.resolve(process.cwd(), '..', 'course.yaml'),
  ]);
}

export function resolveLecturesRoot() {
  return firstExisting([
    path.resolve(process.cwd(), 'lectures'),
    path.resolve(process.cwd(), '..', 'lectures'),
  ]);
}
