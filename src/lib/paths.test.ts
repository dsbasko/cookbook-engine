import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveCourseYaml, resolveLecturesRoot } from './paths';

const tempDirs: string[] = [];

// Each call returns a fresh `repo` dir nested inside its own throwaway parent,
// so probing `../` only ever sees files this test created (never a sibling
// test's leftovers in the shared tmpdir). The parent is what gets cleaned up.
function mkRepo(): { parent: string; repo: string } {
  const parent = mkdtempSync(path.join(tmpdir(), 'cookbook-paths-'));
  tempDirs.push(parent);
  const repo = path.join(parent, 'repo');
  mkdirSync(repo);
  return { parent, repo };
}

function setCwd(dir: string): void {
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveCourseYaml', () => {
  it('prefers ./course.yaml when CWD is the repo root', () => {
    const { parent, repo } = mkRepo();
    writeFileSync(path.join(repo, 'course.yaml'), 'title: Root\n', 'utf8');
    // A decoy one level up must never win over the in-repo manifest.
    writeFileSync(path.join(parent, 'course.yaml'), 'title: Parent\n', 'utf8');
    setCwd(repo);

    expect(resolveCourseYaml()).toBe(path.resolve(repo, 'course.yaml'));
  });

  it('falls back to ../course.yaml when CWD is web/', () => {
    const { repo } = mkRepo();
    writeFileSync(path.join(repo, 'course.yaml'), 'title: Root\n', 'utf8');
    const web = path.join(repo, 'web');
    mkdirSync(web);
    setCwd(web);

    expect(resolveCourseYaml()).toBe(path.resolve(repo, 'course.yaml'));
  });

  it('returns the ./ candidate when nothing exists (caller surfaces ENOENT)', () => {
    const { repo } = mkRepo();
    setCwd(repo);

    expect(resolveCourseYaml()).toBe(path.resolve(repo, 'course.yaml'));
  });

  it('is evaluated lazily — honours the CWD in effect at call time', () => {
    const { repo: a } = mkRepo();
    writeFileSync(path.join(a, 'course.yaml'), 'title: A\n', 'utf8');
    const { repo: b } = mkRepo();
    writeFileSync(path.join(b, 'course.yaml'), 'title: B\n', 'utf8');

    setCwd(a);
    expect(resolveCourseYaml()).toBe(path.resolve(a, 'course.yaml'));
    setCwd(b);
    expect(resolveCourseYaml()).toBe(path.resolve(b, 'course.yaml'));
  });
});

describe('resolveLecturesRoot', () => {
  it('prefers ./lectures when CWD is the repo root', () => {
    const { repo } = mkRepo();
    mkdirSync(path.join(repo, 'lectures'));
    setCwd(repo);

    expect(resolveLecturesRoot()).toBe(path.resolve(repo, 'lectures'));
  });

  it('falls back to ../lectures when CWD is web/', () => {
    const { repo } = mkRepo();
    mkdirSync(path.join(repo, 'lectures'));
    const web = path.join(repo, 'web');
    mkdirSync(web);
    setCwd(web);

    expect(resolveLecturesRoot()).toBe(path.resolve(repo, 'lectures'));
  });
});
