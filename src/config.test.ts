import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCookbookConfig } from './config.mjs';

const ENV_KEY = 'NEXT_PUBLIC_SITE_URL';

/** Writes a course.yaml into a fresh temp dir and points process.cwd() at it. */
function withCourse(yamlBody: string, fileName = 'course.yaml'): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'cookbook-config-'));
  writeFileSync(path.join(dir, fileName), yamlBody, 'utf8');
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
  return dir;
}

const BASE_YAML = 'basePath: /kafka-cookbook\ntitle: Kafka Cookbook\n';

describe('createCookbookConfig', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let originalSiteUrl: string | undefined;
  const tempDirs: string[] = [];

  beforeEach(() => {
    originalSiteUrl = process.env[ENV_KEY];
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    if (originalNodeEnv === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    }
    if (originalSiteUrl === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalSiteUrl;
    }
  });

  function setNodeEnv(value: string) {
    (process.env as Record<string, string | undefined>).NODE_ENV = value;
  }

  it('reads basePath from course.yaml and sets the static export pipeline', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    const config = createCookbookConfig();

    expect(config.output).toBe('export');
    expect(config.trailingSlash).toBe(true);
    expect(config.images).toEqual({ unoptimized: true });
    expect(config.reactStrictMode).toBe(true);
    expect(config.transpilePackages).toEqual(['@dsbasko/cookbook-engine']);
    expect(config.experimental).toMatchObject({ typedRoutes: true });
  });

  it('applies basePath/assetPrefix in production', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    const config = createCookbookConfig();

    expect(config.basePath).toBe('/kafka-cookbook');
    expect(config.assetPrefix).toBe('/kafka-cookbook/');
  });

  it('disables basePath/assetPrefix in development', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('development');

    const config = createCookbookConfig();

    expect(config.basePath).toBe('');
    expect(config.assetPrefix).toBeUndefined();
  });

  it('resolves course.yaml from CWD=web/ (../course.yaml candidate)', () => {
    // Simulate `next build` launched from web/: cwd has no course.yaml, but the
    // parent does. config must probe ../course.yaml, not __dirname.
    const repoRoot = mkdtempSync(path.join(tmpdir(), 'cookbook-config-'));
    writeFileSync(path.join(repoRoot, 'course.yaml'), 'basePath: /pg-cookbook\n', 'utf8');
    const webDir = path.join(repoRoot, 'web');
    mkdirSync(webDir, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(webDir);
    tempDirs.push(repoRoot);
    setNodeEnv('production');

    const config = createCookbookConfig();

    expect(config.basePath).toBe('/pg-cookbook');
  });

  it('throws when basePath is missing or invalid', () => {
    tempDirs.push(withCourse('title: No Base Path\n'));
    expect(() => createCookbookConfig()).toThrow(/basePath/);

    tempDirs.push(withCourse('basePath: kafka-cookbook\n'));
    expect(() => createCookbookConfig()).toThrow(/basePath/);
  });

  it('injects brand.siteUrl into env.NEXT_PUBLIC_SITE_URL at build time', () => {
    tempDirs.push(
      withCourse(`${BASE_YAML}brand:\n  siteUrl: https://kafka.dsbasko.dev\n`),
    );
    setNodeEnv('production');

    const config = createCookbookConfig();

    expect(config.env).toEqual({ NEXT_PUBLIC_SITE_URL: 'https://kafka.dsbasko.dev' });
  });

  it('does not set env when brand.siteUrl is absent', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    const config = createCookbookConfig();

    expect(config.env).toBeUndefined();
  });

  it('lets an explicit NEXT_PUBLIC_SITE_URL env win over brand.siteUrl', () => {
    process.env[ENV_KEY] = 'https://override.example.com';
    tempDirs.push(
      withCourse(`${BASE_YAML}brand:\n  siteUrl: https://kafka.dsbasko.dev\n`),
    );
    setNodeEnv('production');

    const config = createCookbookConfig();

    // No injected env key — getSiteUrl() reads the existing process.env value.
    expect(config.env).toBeUndefined();
  });

  it('wires a webpack alias mapping "@" to the engine src dir', () => {
    // Under transpilePackages the consumer's webpack compiles the engine's
    // source, which imports via the `@/*` alias. createCookbookConfig must
    // inject that alias so those imports resolve, pointing at the engine's own
    // src (this config.mjs lives in it), not the consumer.
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    const config = createCookbookConfig();
    expect(typeof config.webpack).toBe('function');

    const webpackConfig = { resolve: { alias: { existing: '/keep' } } };
    const result = config.webpack!(webpackConfig as never, {} as never);
    expect(result.resolve.alias['@']).toMatch(/[/\\]src$/);
    // Pre-existing aliases are preserved, not clobbered.
    expect(result.resolve.alias.existing).toBe('/keep');
  });

  it('composes a user-supplied webpack override after the alias', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    let sawAlias: string | undefined;
    const userWebpack = vi.fn((cfg: { resolve: { alias: Record<string, string> } }) => {
      sawAlias = cfg.resolve.alias['@'];
      cfg.resolve.alias.user = '/user';
      return cfg;
    });

    const config = createCookbookConfig({ webpack: userWebpack as never });
    const result = config.webpack!({ resolve: {} } as never, {} as never);

    expect(userWebpack).toHaveBeenCalledOnce();
    // The user override runs after the engine alias is in place.
    expect(sawAlias).toMatch(/[/\\]src$/);
    expect(result.resolve.alias.user).toBe('/user');
  });

  it('merges overrides over the base config and preserves experimental defaults', () => {
    tempDirs.push(withCourse(BASE_YAML));
    setNodeEnv('production');

    const config = createCookbookConfig({
      reactStrictMode: false,
      experimental: { mdxRs: true },
      env: { CUSTOM_FLAG: '1' },
    });

    expect(config.reactStrictMode).toBe(false);
    expect(config.experimental).toEqual({ typedRoutes: true, mdxRs: true });
    expect(config.env).toMatchObject({ CUSTOM_FLAG: '1' });
  });
});
