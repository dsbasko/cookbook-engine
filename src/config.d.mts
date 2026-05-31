import type { NextConfig } from 'next';

/**
 * Builds the Next.js config for a cookbook course consumer. Reads `course.yaml`
 * (via process.cwd()) for `basePath`, enables the static export pipeline, wires
 * `transpilePackages` for the engine, and injects `course.brand.siteUrl` into
 * `env.NEXT_PUBLIC_SITE_URL` at build time when present.
 */
export function createCookbookConfig(overrides?: NextConfig): NextConfig;

declare const _default: typeof createCookbookConfig;
export default _default;
