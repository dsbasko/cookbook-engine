# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@dsbasko/cookbook-engine` is a reusable Next.js 14 (static-export) engine for
cookbook-style courses. The contract: one engine, many courses. A new course is a
**data-only** repo — `course.yaml` + `lectures/` + `public/` + a thin `web/` wrapper of
bare re-exports. All logic, UI, and SEO live in this package; consumers ship only data
and brand. `kafka-cookbook` is the first real consumer; `examples/` is the in-repo
demo course that doubles as the test harness.

The full consumer-facing contract (how to author a course, `course.yaml` format, the
`brand` section, public entry-points, SemVer policy) is documented in `README.md`
(Russian). Read it before changing any public surface.

## Commands

```bash
pnpm install
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest run — unit tests are the public-behavior contract
pnpm test:watch      # vitest watch
pnpm lint            # eslint .
pnpm examples:dev    # next dev on examples/web → localhost:3000
pnpm smoke           # next build examples/web (output:'export') — e2e SSG smoke test
```

Run a single test file or pattern:

```bash
pnpm vitest run src/lib/lesson-gate.test.ts
pnpm vitest run -t 'resolveFurthestIndex'   # by test name
```

Requires Node `>=20` and pnpm `9`. Tests run under jsdom with `globals: true` (no
imports of `describe`/`it`/`expect` needed); the `@/*` alias resolves to `src/` in both
`tsconfig.json` and `vitest.config.ts`.

## Architecture — the non-obvious parts

**Source-as-package (no build step).** The package ships **untranspiled ESM**: raw
`.ts`/`.tsx`/`.css` from `src/`. There is no `dist/` and no compile. Consumers opt into
`transpilePackages: ['@dsbasko/cookbook-engine']` (baked into `createCookbookConfig`),
which preserves `'use client'`, `next/font`, and server/client component boundaries.
Consequence: edits to `src/` are consumed as-is — keep them valid for a consumer's
webpack, not just for `tsc`.

**Two path-resolution worlds — never mix them.** This is the central design constraint:
- **Course data** (`course.yaml`, `lectures/`, `public/`) is always resolved from the
  consumer via `process.cwd()` — see `src/lib/paths.ts`, `src/lib/course-loader.ts`,
  and `resolveCourseYamlPath` in `src/config.mjs`. It probes both CWD=repo-root
  (`./course.yaml`) and CWD=`web/` (`../course.yaml`).
- **Engine source** is resolved relative to the engine itself via `import.meta.url`
  (e.g. `ENGINE_SRC` in `config.mjs`).
- Resolving course data via `__dirname`/`import.meta.url` would point inside
  `node_modules` and crash the consumer build. Resolving engine source via `cwd` would
  break when the engine is installed as a dependency. Keep this split intact.

**The `@/*` alias must work in the consumer.** Engine internals import via `@/foo`. The
consumer's webpack would not know this alias, so `createCookbookConfig` injects
`config.resolve.alias['@'] = ENGINE_SRC` automatically. Don't assume `@/` resolves in
arbitrary tooling — only `tsc` (via `tsconfig.json paths`), vitest, and the injected
webpack alias know it.

**Entry-points are the public API**, declared in `package.json#exports` and mirrored by
`src/layout/*`, `src/pages/*`, `src/og/*`, `src/seo/*`, `src/config.mjs`. Consumers
re-export these by name because Next.js requires `default` /
`generateStaticParams` / `generateMetadata` to be named exports of the route file
itself. `src/index.ts` is a barrel (escape hatch) of components + lib helpers for
advanced consumers composing custom layouts. Changing any export signature, removing an
entry-point, or removing/renaming a `course.yaml` field is a **major** version bump
(see README SemVer policy).

**Config flow.** `createCookbookConfig(overrides?)` reads `course.yaml#basePath`, sets
`output: 'export'`, prod-only `basePath`/`assetPrefix`, `trailingSlash`,
`images.unoptimized`, injects the `@` webpack alias, and surfaces `brand.siteUrl` →
`env.NEXT_PUBLIC_SITE_URL` (an explicit env var wins). `overrides` are shallow-merged,
preserving `experimental` defaults.

**Library layout (`src/lib/`).** Course model + loading (`course`, `course-loader`,
`lesson`, `paths`), i18n (`lang`, `i18n`, `use-i18n`), content rendering (`markdown`,
`markdown-components`, `mdx-plugins/`, `extract-toc`, `slug`), client state
(`theme`, `progress`, `progress-mode`, `reading-prefs`, `lesson-gate`,
`program-drawer`), and SEO (`site-url`, `sitemap`). Unit tests sit next to each module
and encode the intended behavior — treat a failing test as a spec, and add/adjust tests
when changing behavior.

**Lesson gating** (`lib/lesson-gate.ts`, `GateProvider`, `gate-init-script`,
`gate-mark-script`) is progress-driven and designed to survive cross-tab races and
stale pointers (see the `resolveFurthestIndex` doc comment). It heals a regressed
"furthest" pointer from the still-valid `progress` map rather than trusting either
source alone.

**Build hooks for consumers.** `scripts/` provides the `bin` helpers
`cookbook-sync-images` (`sync-images.mjs`) and `cookbook-fix-static-images`
(`fix-static-image-extensions.mjs`), plus coverage/TOC tooling. They resolve paths via
`process.cwd()`, so they run from the consumer's `web/`. Course `prebuild`/`postbuild`
hooks invoke them.

## Workspace

The repo is itself a pnpm workspace (`pnpm-workspace.yaml`: `.` + `examples/web`) so the
demo consumer links the engine by name (`workspace:*`) instead of via the registry.
`pnpm smoke` (next build of `examples/web`) is the closest thing to an integration test —
run it after touching config, entry-points, or anything that affects SSG.

## Conventions

- Prettier: single quotes, semicolons, trailing commas (`all`), `printWidth: 100`,
  2-space indent. ESLint extends `next/core-web-vitals` + `prettier`.
- The package source must stay framework-faithful: keep `'use client'` directives,
  prefer the existing module boundaries, and co-locate a `*.test.ts(x)` with new lib
  behavior.
