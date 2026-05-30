# @dsbasko/cookbook-engine

[![npm version](https://img.shields.io/npm/v/@dsbasko/cookbook-engine.svg)](https://www.npmjs.com/package/@dsbasko/cookbook-engine)
[![CI](https://github.com/dsbasko/cookbook-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/dsbasko/cookbook-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/node/v/@dsbasko/cookbook-engine.svg)](https://nodejs.org)

A reusable Next.js 14 static-export engine for cookbook-style courses. One engine, many courses.

A new course is a **data-only** repo: `course.yaml` + `lectures/` + `public/` + a thin
`web/` wrapper of bare re-exports. All logic, UI, and SEO live in the package; the course
repo ships only its data and brand.

`kafka-cookbook` is the first consumer of the package and its live validator.

## Features

- **One engine, many courses.** A new course carries zero TS logic; all behavior comes
  from the package.
- **Next.js 14 static export.** Builds to `output: 'export'`, so a course deploys as plain
  static files (GitHub Pages, S3, any CDN).
- **Source-as-package.** The package ships **untranspiled ESM** (`.tsx`/`.ts`/`.css` from
  `src/` as-is): no build step, no `dist/`. Consumers opt into `transpilePackages`, which
  is baked into `createCookbookConfig`.
- **Markdown-driven content** with GFM, syntax highlighting (Shiki), autolinked headings,
  GitHub-style alerts, and an extracted table of contents.
- **Bilingual i18n** with per-language lecture content and a fallback banner (plus
  `noindex`) for missing translations.
- **Brand-only theming.** A course changes its brand by editing `course.yaml` plus a logo
  in `public/`; no code changes required.
- **SEO out of the box:** sitemap, robots, Open Graph image generation, and favicon.
- **Unit tests as the contract.** Vitest tests live next to each lib module and encode the
  intended public behavior.

## Installation

Requires Node `>=20` and pnpm `9.15.0`.

```bash
pnpm add @dsbasko/cookbook-engine next react react-dom
```

`next`, `react`, and `react-dom` are peer dependencies (`next@^14.2.18`,
`react@^18.3.1`, `react-dom@^18.3.1`).

## Quickstart: authoring a new course

A new course is a repo with **data only**: zero TS logic, all behavior comes from the
package. Four things are needed.

### 1. Course data

```
my-course/
├── course.yaml          # manifest: modules, lessons, i18n titles, basePath, brand
├── lectures/            # markdown content
│   └── <module>/<slug>/i18n/<lang>/README.md
├── web/                 # thin consumer wrapper (see below)
└── public/              # favicon, logo, OG images for the course (course-specific)
```

`course.yaml` describes the structure (see the field reference below); lesson content
lives in `lectures/<module>/<slug>/i18n/<lang>/README.md`. If a translation is missing for
a language, the engine renders a fallback banner and serves `noindex` on that page.

### 2. The thin `web/` wrapper

Every route file is a **bare re-export** of a package entry-point. Next.js requires
`default` / `generateStaticParams` / `generateMetadata` to be named exports of the route
file itself, so re-export is the only valid form (the data comes from the course `cwd` via
the filesystem, so there is no need to parameterize paths).

```
web/
├── next.config.mjs                     # export default createCookbookConfig()
├── package.json                        # depends on @dsbasko/cookbook-engine
├── tsconfig.json                       # paths: @/* → engine/src/*
└── app/
    ├── layout.tsx                      # → /layout/root
    ├── page.tsx                        # → /pages/root
    ├── not-found.tsx                   # → /pages/not-found-root
    ├── icon.tsx                        # → /og/icon
    ├── opengraph-image.tsx             # → /og/opengraph-image
    ├── robots.ts                       # → /seo/robots
    ├── sitemap.ts                      # → /seo/sitemap
    └── [lang]/
        ├── layout.tsx                  # → /layout/lang
        ├── page.tsx                    # → /pages/home
        ├── not-found.tsx               # → /pages/not-found-lang
        └── [module]/
            ├── page.tsx                # → /pages/module
            └── [lesson]/page.tsx       # → /pages/lesson
```

The entire `web/next.config.mjs`:

```js
import { createCookbookConfig } from '@dsbasko/cookbook-engine/config';
export default createCookbookConfig();
```

A re-export example (`web/app/[lang]/[module]/[lesson]/page.tsx`):

```ts
export {
  default,
  generateStaticParams,
  generateMetadata,
} from '@dsbasko/cookbook-engine/pages/lesson';
```

A complete, ready-to-use wrapper lives in [`examples/web/`](./examples/web). Copy it as a
1-to-1 template.

### 3. The wrapper `tsconfig`

The engine's internal code uses the TS alias `@/*`. So the consumer's `tsc` can resolve it,
add this to `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./node_modules/@dsbasko/cookbook-engine/src/*"] }
  }
}
```

The webpack alias `@` -> `engine/src` is injected automatically by
`createCookbookConfig`, so there is nothing to wire up by hand for the build.

### 4. Build

```bash
pnpm install
pnpm -C web build          # next build, output:'export' -> web/out/
```

The course's `prebuild`/`postbuild` hooks call the package helpers
(`cookbook-sync-images`, `cookbook-fix-static-images`): they sync lesson images and fix the
extensions of static images. Both resolve paths via `process.cwd()`, so they run from
`web/`.

## `course.yaml` reference

The required base fields are the same as for any course: `title`, `description`
(`{ ru, en }`), `basePath`, `repoUrl`, `modules[]`. Branding is the optional `brand`
section; when it is absent, the engine falls back to the historical Kafka Cookbook
defaults, so existing courses render unchanged.

```yaml
brand:
  accent: "#7c3aed"        # hex; overrides the --accent-main family (light/paper)
  accentDark: "#a78bfa"    # hex; for [data-theme=dark]; fallback -> accent
  glyph: "D"               # single character for favicon + OG image badge (default "K")
  logo: /logo.svg          # path inside the course public/
  siteUrl: https://my.dev  # canonical origin; sugar over NEXT_PUBLIC_SITE_URL
  level: "Demo"            # stack label in the stats card (default "Go")
  breadcrumbRoot: { ru: Demo Cookbook, en: Demo Cookbook }   # breadcrumb/header label
  hero:                    # three-part homepage heading (lead / accent / tail)
    lead:   { ru: A demo, en: A demo }
    accent: { ru: Cookbook, en: Cookbook }
    tail:   { ru: engine in practice, en: engine in practice }
  ogImage:
    title:    { ru: Demo Cookbook, en: Demo Cookbook }
    subtitle: { ru: The engine harness, en: The engine harness }   # fallback -> truncated description
    footerTag: "cookbook-engine - demo"                            # default "Apache Kafka - Go"
    alt:      { ru: Demo Cookbook, en: Demo Cookbook }              # fallback -> i18n default
```

Validation rules (`parseCourse` / `parseBrand`):

- `accent` / `accentDark`: must be valid hex, otherwise the build fails with a parse error.
- `siteUrl`: an `http(s)` URL.
- scalar fields (`glyph`, `level`, `footerTag`): non-empty strings.
- per-language fields (`breadcrumbRoot`, `hero.*`, `ogImage.title/subtitle/alt`) resolve to
  a single string for the active language at parse time, the same as `title` / `description`.

Accent color: `brand.accent` collapses light + paper into one color and derives
hover/soft via `color-mix`. It overrides the `--accent-main` family through an inline
`<style>` with `:root[data-theme]` selectors (specificity beats `tokens.css`). For
hand-tuned per-theme palettes (Kafka uses three separate accents for light, paper, and
dark), omit `brand.accent` and edit `tokens.css` in the engine instead.

Changing the brand is done **only** by editing `course.yaml` plus the logo in `public/`,
with no code changes.

## Public API: entry-points (via `package.json#exports`)

| Import                                              | Purpose                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `@dsbasko/cookbook-engine`                          | Barrel: components + key lib functions           |
| `@dsbasko/cookbook-engine/config`                   | `createCookbookConfig(overrides?)`               |
| `@dsbasko/cookbook-engine/layout/root`              | Root layout: `default` + `generateMetadata` + `viewport` |
| `@dsbasko/cookbook-engine/layout/lang`              | `[lang]` layout: `default` + `generateStaticParams` + `generateMetadata` |
| `@dsbasko/cookbook-engine/pages/root`               | Index `/` (lang redirect)                        |
| `@dsbasko/cookbook-engine/pages/home`               | Home `[lang]`                                    |
| `@dsbasko/cookbook-engine/pages/module`             | Module page                                      |
| `@dsbasko/cookbook-engine/pages/lesson`             | Lesson page                                      |
| `@dsbasko/cookbook-engine/pages/not-found-root`     | 404 (static EN)                                  |
| `@dsbasko/cookbook-engine/pages/not-found-lang`     | 404 (client-side i18n)                           |
| `@dsbasko/cookbook-engine/og/icon`                  | favicon                                          |
| `@dsbasko/cookbook-engine/og/opengraph-image`       | OG image                                         |
| `@dsbasko/cookbook-engine/seo/sitemap`              | sitemap.xml                                      |
| `@dsbasko/cookbook-engine/seo/robots`               | robots.txt                                       |
| `@dsbasko/cookbook-engine/styles/*.css`             | Global styles (`reset`, `tokens`, `globals`, `markdown`) |

`createCookbookConfig(overrides?)` reads `course.yaml` via `process.cwd()`, takes
`basePath`, sets `output: 'export'`, `trailingSlash`, `images.unoptimized`, prod-only
`basePath`/`assetPrefix`, `transpilePackages: ['@dsbasko/cookbook-engine']`, inlines the
webpack alias `@` -> `engine/src`, and surfaces `brand.siteUrl` as
`env.NEXT_PUBLIC_SITE_URL` (an explicit env var wins). `overrides` are shallow-merged on
top, preserving the `experimental` defaults.

## How it works

### Package contents

- `src/components/**`: UI components (AppShell, Header, Sidebar, Toc, CodeBlock, LessonNav,
  and the theme, progress, reading-prefs, and gating providers).
- `src/lib/**`: course-loader, markdown, i18n, gating, progress, SEO helpers, and
  `mdx-plugins/**`. Unit tests (`*.test.ts`, vitest) sit next to each module and are the
  contract of public behavior.
- `src/styles/**`: `reset`, `tokens`, `globals`, `markdown`.
- `src/layout/**`, `src/pages/**`, `src/og/**`, `src/seo/**`: entry-points for the course
  routes.
- `src/config.mjs`: `createCookbookConfig()`.
- `assets/fonts/**`: woff2 (JetBrains Mono), shared across all courses.
- `scripts/**`: build helpers (`cookbook-sync-images`, `cookbook-fix-static-images`,
  coverage/TOC).

### Source-as-package (no build step)

The package format is **untranspiled ESM** (source as-is: `.tsx`/`.ts`/`.css`). The
consumer enables `transpilePackages` (baked into `createCookbookConfig`), which preserves
`'use client'`, `next/font`, and the server/client component boundaries. Edits to `src/`
are consumed as-is, so the source must stay valid for a consumer's webpack, not only for
`tsc`.

### Two path-resolution worlds, never mixed

This is the central design constraint:

- **Course data** (`course.yaml`, `lectures/`, `public/`) is always resolved from the
  consumer via `process.cwd()`. The loader probes both CWD = repo-root (`./course.yaml`)
  and CWD = `web/` (`../course.yaml`).
- **Engine source** is resolved relative to the engine itself via `import.meta.url`.


Resolving course data via `import.meta.url` would point inside `node_modules` and crash
the consumer build; resolving engine source via `cwd` would break when the engine is
installed as a dependency. Keep this split intact.

## SemVer policy

The public contract is `package.json#exports`, the entry-point signatures, and the
`course.yaml` format (including the `brand` section). The version is the contract.

- **major**: a breaking change. An entry-point removed or renamed, a route export signature
  changed, a `course.yaml` field removed or renamed, validation tightened so that a
  previously valid course stops building, or a change to the `next`/`react` peer range.
- **minor**: a new entry-point, a new **optional** `brand`/`course.yaml` field, a new
  component in the barrel, or a new feature that does not break existing courses.
- **patch**: bug fixes, style or content tweaks, and internal refactors that do not change
  the contract.

Consumers (`kafka-cookbook` and others) pin a major range and get engine updates via
`pnpm update`. Changes that require edits to courses ship only in a major release.

> By design there is **no** automated npm publish workflow and **no** changelog; releases
> are published manually via `pnpm publish`.

## Development

The main playground is the `examples/` mini-course (a bilingual demo course with a full
`brand` section):

```bash
pnpm install
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest run (the public-behavior contract)
pnpm test:watch      # vitest watch
pnpm lint            # eslint .
pnpm examples:dev    # run examples/web on localhost:3000
pnpm smoke           # next build examples/web (output:'export'); the SSG e2e smoke test
```

Conventions: Prettier (single quotes, semicolons, trailing commas `all`, `printWidth` 100,
2-space indent); ESLint extends `next/core-web-vitals` + `prettier`. Co-locate a
`*.test.ts(x)` with each lib module. Unit tests are the public-behavior contract.

## Contributing

Contributions are welcome. See [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md) for the
workflow, coding conventions, and how to run the test suite. For security issues, contact
d.basenko.acc@gmail.com.

## License

[MIT](./LICENSE) © Dmitriy Basenko
