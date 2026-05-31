import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const PACKAGE_NAME = '@dsbasko/cookbook-engine';

// Absolute path to the engine's own `src/` dir. This file lives at
// `<engineRoot>/src/config.mjs`, so dirname(import.meta.url) IS that dir even
// when the engine is installed under the consumer's node_modules. Note the
// asymmetry with course.yaml resolution: course.yaml MUST come from the
// consumer (process.cwd()), but the engine's source is resolved relative to the
// engine itself — that is exactly what import.meta.url gives here.
const ENGINE_SRC = path.dirname(fileURLToPath(import.meta.url));

// Resolve the consumer's course.yaml relative to process.cwd() — NEVER via
// import.meta.url/__dirname. The engine lives in node_modules, so a __dirname
// probe would point inside the package and the build would crash at startup
// (see plan Task 0b verdict). The consumer runs `next build` from web/, so we
// probe both CWD=repo-root (`./course.yaml`) and CWD=web/ (`../course.yaml`),
// matching the candidate lists in lib/course-loader.ts.
function resolveCourseYamlPath() {
  const candidates = [
    path.resolve(process.cwd(), 'course.yaml'),
    path.resolve(process.cwd(), '..', 'course.yaml'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function readCourse() {
  const courseYamlPath = resolveCourseYamlPath();
  const course = yaml.load(readFileSync(courseYamlPath, 'utf8'));
  if (!course || typeof course.basePath !== 'string' || !course.basePath.startsWith('/')) {
    throw new Error(
      `createCookbookConfig: course.yaml at ${courseYamlPath} must define a basePath string starting with '/'`,
    );
  }
  return course;
}

/**
 * Builds the Next.js config for a cookbook course consumer.
 *
 * Reads `course.yaml` (via process.cwd()) for `basePath`, enables the static
 * export pipeline, wires `transpilePackages` for the engine, and — when
 * `course.brand.siteUrl` is set — injects it into `env.NEXT_PUBLIC_SITE_URL`
 * at build time so the client-only `getSiteUrl()` stays env-based.
 *
 * @param {import('next').NextConfig} [overrides] shallow-merged over the base config.
 * @returns {import('next').NextConfig}
 */
export function createCookbookConfig(overrides = {}) {
  const course = readCourse();
  const coursePath = course.basePath;
  const isProd = process.env.NODE_ENV === 'production';

  // brand.siteUrl is sugar over NEXT_PUBLIC_SITE_URL: surface it at build time
  // so the client bundle inlines it. An explicit env var still wins.
  const siteUrl =
    course.brand && typeof course.brand.siteUrl === 'string' && course.brand.siteUrl.trim().length > 0
      ? course.brand.siteUrl.trim()
      : undefined;
  const env = {
    ...(siteUrl && !process.env.NEXT_PUBLIC_SITE_URL ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {}),
    ...(overrides.env ?? {}),
  };

  // The engine source uses the `@/*` path alias internally (TS-only). Under
  // transpilePackages the consumer's webpack compiles those files, so it must
  // resolve `@/foo` to the engine's own src — otherwise every engine import
  // fails with "Module not found". The consumer apps are thin re-export
  // wrappers with no `@/` imports of their own, so this global alias is safe.
  const userWebpack = typeof overrides.webpack === 'function' ? overrides.webpack : undefined;
  /** @type {NonNullable<import('next').NextConfig['webpack']>} */
  const webpack = (config, context) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = { ...(config.resolve.alias ?? {}), '@': ENGINE_SRC };
    return userWebpack ? userWebpack(config, context) : config;
  };

  /** @type {import('next').NextConfig} */
  const base = {
    output: 'export',
    basePath: isProd ? coursePath : '',
    assetPrefix: isProd ? `${coursePath}/` : undefined,
    trailingSlash: true,
    images: { unoptimized: true },
    reactStrictMode: true,
    transpilePackages: [PACKAGE_NAME],
    webpack,
    experimental: {
      typedRoutes: true,
      ...(overrides.experimental ?? {}),
    },
    ...(Object.keys(env).length > 0 ? { env } : {}),
  };

  const {
    experimental: _experimental,
    env: _env,
    webpack: _webpack,
    ...restOverrides
  } = overrides;
  return { ...base, ...restOverrides };
}

export default createCookbookConfig;
