# Contributing to `@dsbasko/cookbook-engine`

Thanks for your interest in improving the engine. This document explains how to set up
the project locally, the checks every change must pass, and the conventions that keep the
public contract stable.

`@dsbasko/cookbook-engine` is a reusable Next.js 14 static-export (`output: 'export'`)
engine for cookbook-style courses. The contract is **one engine, many courses**: a new
course is a **data-only** repo — `course.yaml` + `lectures/` + `public/` + a thin `web/`
wrapper of bare re-exports. All logic, UI, and SEO live in this package. The package ships
**untranspiled ESM** source (no build step, no `dist/`); consumers opt into
`transpilePackages`.

Author: Dmitriy Basenko. License: MIT.

## Prerequisites

- **Node.js `>= 20`**
- **pnpm `9`** (the repo pins `pnpm@9.15.0` via `packageManager`)

Use `corepack` to get the exact pnpm version without a global install:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

## Local setup

The repo is itself a **pnpm workspace** (`pnpm-workspace.yaml`: `.` + `examples/web`). The
demo consumer in `examples/web` links the engine **by name** (`workspace:*`) instead of via
the npm registry, so changes to `src/` are picked up immediately without publishing.

```bash
git clone https://github.com/dsbasko/cookbook-engine.git
cd cookbook-engine
pnpm install        # installs root engine + examples/web in one pass
```

`examples/` is the in-repo demo course that doubles as the test harness. Run it to see your
changes in a real consumer:

```bash
pnpm examples:dev   # next dev on examples/web → http://localhost:3000
```

## Dev loop and required checks

Before opening a PR, **all four of these must pass**:

```bash
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint .
pnpm test           # vitest run — unit tests are the public-behavior contract
pnpm smoke          # next build of examples/web (output:'export') — the SSG e2e smoke test
```

A few notes:

- `pnpm test:watch` (vitest watch) is handy while iterating.
- `pnpm smoke` is the closest thing to an integration test. **Always run it after touching
  config, entry-points, or anything that affects SSG** — a green `tsc` does not guarantee a
  consumer's webpack build succeeds.
- Tests run under jsdom with `globals: true`, so you do not import `describe`/`it`/`expect`.
  The `@/*` alias resolves to `src/` in both `tsconfig.json` and `vitest.config.ts`.

### Running a single test

```bash
pnpm vitest run src/lib/lesson-gate.test.ts      # by file
pnpm vitest run -t 'resolveFurthestIndex'        # by test name
```

## Code conventions

- **Prettier**: single quotes, semicolons, trailing commas (`all`), `printWidth: 100`,
  2-space indent.
- **ESLint** extends `next/core-web-vitals` + `prettier`. Run `pnpm lint` and fix all
  warnings before submitting.
- **Co-locate tests.** Put a `*.test.ts(x)` next to each lib module. Unit tests **are the
  public-behavior contract** — treat a failing test as a spec, and add or adjust tests when
  you change behavior. New lib behavior without a co-located test will be asked to add one.
- Keep the source **framework-faithful**: preserve `'use client'` directives, prefer the
  existing module boundaries, and do not collapse server/client component splits.

## The two hard architectural constraints

These two rules are the heart of the design. A change that violates either one can build
fine locally yet crash every consumer, so reviewers watch for them closely.

### 1. Source-as-package (no build step)

The package ships raw `.ts` / `.tsx` / `.css` from `src/` — **untranspiled ESM**, no
compile. Consumers opt into `transpilePackages: ['@dsbasko/cookbook-engine']` (baked into
`createCookbookConfig`), which preserves `'use client'`, `next/font`, and the
server/client component boundaries.

Consequence: **edits to `src/` are consumed as-is.** Keep them valid for a *consumer's*
webpack, not just for `tsc`. Don't rely on transforms that only `tsc` or a bundler would
apply. This is exactly why `pnpm smoke` exists — run it.

### 2. Two path-resolution worlds — never mix them

- **Course data** (`course.yaml`, `lectures/`, `public/`) is always resolved from the
  consumer via `process.cwd()` — see `src/lib/paths.ts`, `src/lib/course-loader.ts`, and
  `resolveCourseYamlPath` in `src/config.mjs`. It probes both CWD=repo-root
  (`./course.yaml`) and CWD=`web/` (`../course.yaml`).
- **Engine source** is resolved relative to the engine itself via `import.meta.url`
  (e.g. `ENGINE_SRC` in `config.mjs`).

Mixing these breaks things: resolving course data via `__dirname` / `import.meta.url` would
point inside `node_modules` and crash the consumer build; resolving engine source via `cwd`
would break when the engine is installed as a dependency. **Keep this split intact.**

## SemVer policy

The public API is the set of entry-points declared in `package.json#exports` plus the
`course.yaml` field contract. Version your changes accordingly:

- **MAJOR** — a breaking change to the public surface:
  - changing any export signature,
  - removing or renaming an entry-point in `package.json#exports`,
  - removing or renaming a `course.yaml` field.
- **MINOR** — backward-compatible additions:
  - new additive entry-points,
  - new **optional** `course.yaml` fields.
- **PATCH** — bug fixes that do not change the public surface.

When in doubt about whether a change is breaking, call it out in your PR description so a
maintainer can confirm the bump level.

> Releases are published **manually** via `pnpm publish` (scoped, `--access public`). There
> is intentionally **no automated npm publish workflow** and **no `CHANGELOG`** in this
> repo — please don't add one in a PR.

## Commit & PR expectations

- Keep PRs focused: one logical change per PR.
- Ensure `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm smoke` all pass locally
  before requesting review.
- Write clear commit messages in the imperative mood (e.g. `fix: heal regressed furthest
  pointer`). Conventional-commit prefixes (`feat`, `fix`, `refactor`, `chore`, `docs`,
  `test`, `perf`, `build`, `ci`) are appreciated.
- In the PR description, state **why** the change is needed and call out the SemVer impact
  (major / minor / patch) if you touched any public surface.
- If you changed behavior, update or add the co-located `*.test.ts(x)` so the test suite
  still encodes the intended contract.
- Update `README.md` (the consumer-facing contract) whenever you change a public
  entry-point, the `course.yaml` format, or anything a course author depends on.

## Security

Please **do not** open public issues for security problems. Report them privately to
**d.basenko.acc@gmail.com**.

## Code of Conduct

By participating in this project you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).
