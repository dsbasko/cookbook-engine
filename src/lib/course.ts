import yaml from 'js-yaml';
import { type Lang } from './lang';
import { isValidSlug } from './slug';

export interface Lesson {
  slug: string;
  title: string;
  duration: string;
  tags: string[];
  hasTranslation: boolean;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface BrandHero {
  lead: string;
  accent: string;
  tail: string;
}

export interface BrandOgImage {
  title?: string;
  subtitle?: string;
  footerTag?: string;
  alt?: string;
}

/**
 * Optional branding for a course. Every field is optional and, when absent,
 * the engine falls back to the historical Kafka Cookbook defaults (see
 * DEFAULT_BRAND_* + the resolve* helpers below) so existing courses keep
 * rendering exactly as before. Localized fields (hero, breadcrumbRoot,
 * ogImage.title/subtitle/alt) are resolved to a single string for the active
 * `lang` at parse time, mirroring how title/description are handled.
 */
export interface Brand {
  /** Accent colour (hex) — overrides the --accent-main family in light/paper. */
  accent?: string;
  /** Accent colour (hex) for [data-theme=dark]; falls back to `accent`. */
  accentDark?: string;
  /** Path to a logo asset in the course's public/ folder. */
  logo?: string;
  /** Single glyph used by the favicon + og-image badge (default "K"). */
  glyph?: string;
  /** Canonical site origin; sugar over NEXT_PUBLIC_SITE_URL (see config.mjs). */
  siteUrl?: string;
  /** Stack label shown in the stats card (default "Go"). */
  level?: string;
  /** Wordmark used for breadcrumbs/header/og (default "Kafka Cookbook"). */
  breadcrumbRoot?: string;
  /** Three-part hero headline (lead / accent / tail). */
  hero?: BrandHero;
  /** Open Graph image overrides. */
  ogImage?: BrandOgImage;
}

export interface Course {
  title: string;
  description: string;
  basePath: string;
  repoUrl: string;
  modules: Module[];
  brand?: Brand;
}

/** Historical Kafka Cookbook defaults — used when a course omits `brand`. */
export const DEFAULT_BRAND_NAME = 'Kafka Cookbook';
export const DEFAULT_BRAND_GLYPH = 'K';
export const DEFAULT_BRAND_LEVEL = 'Go';
export const DEFAULT_BRAND_FOOTER_TAG = 'Apache Kafka · Go';

export function resolveBrandName(course: Course): string {
  return course.brand?.breadcrumbRoot ?? DEFAULT_BRAND_NAME;
}

export function resolveBrandGlyph(course: Course): string {
  return course.brand?.glyph ?? DEFAULT_BRAND_GLYPH;
}

export function resolveBrandLevel(course: Course): string {
  return course.brand?.level ?? DEFAULT_BRAND_LEVEL;
}

export function resolveOgFooterTag(course: Course): string {
  return course.brand?.ogImage?.footerTag ?? DEFAULT_BRAND_FOOTER_TAG;
}

/**
 * Builds the inline <style> that overrides the --accent-main family from a
 * single brand accent. Returns null when no `brand.accent` is set (the
 * engine then keeps the hand-tuned tokens.css defaults).
 *
 * The selectors use `:root[data-theme=…]` (specificity 0,1,1) so they win the
 * cascade over tokens.css' `[data-theme=…]` (0,1,0) regardless of stylesheet
 * order — verified by tests. Hover/soft shades derive from the base accent via
 * color-mix so a course only declares one colour per theme.
 */
export function buildBrandAccentCss(brand?: Brand): string | null {
  const light = brand?.accent;
  if (!light) return null;
  const dark = brand.accentDark ?? light;
  return (
    `:root[data-theme='light'],:root[data-theme='paper']{` +
    `--accent-base:${light};` +
    `--accent-main:${light};` +
    `--accent-main-hover:color-mix(in srgb, ${light} 85%, #000);` +
    `--accent-main-soft:color-mix(in srgb, ${light} 12%, transparent);}` +
    `:root[data-theme='dark']{` +
    `--accent-base:${dark};` +
    `--accent-main:${dark};` +
    `--accent-main-hover:color-mix(in srgb, ${dark} 85%, #fff);` +
    `--accent-main-soft:color-mix(in srgb, ${dark} 12%, transparent);}`
  );
}

export interface FlatLessonEntry {
  moduleId: string;
  lesson: Lesson;
  index: number;
}

export function parseCourse(
  source: string,
  lang: Lang = 'ru',
  sourcePath = '<inline>',
): Course {
  let parsed: unknown;
  try {
    parsed = yaml.load(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`course.yaml: invalid YAML in ${sourcePath}: ${message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`course.yaml: expected top-level mapping in ${sourcePath}`);
  }

  const title = requireLocalized(parsed, 'title', lang);
  const description = requireLocalized(parsed, 'description', lang);
  const basePath = requireString(parsed, 'basePath');
  const repoUrl = requireString(parsed, 'repoUrl');

  const rawModules = parsed.modules;
  if (!Array.isArray(rawModules) || rawModules.length === 0) {
    throw new Error(`course.yaml: "modules" must be a non-empty array`);
  }

  const seenModuleIds = new Set<string>();
  const modules: Module[] = rawModules.map((value, index) => {
    const where = `modules[${index}]`;
    if (!isPlainObject(value)) {
      throw new Error(`course.yaml: ${where} must be a mapping`);
    }

    const id = requireString(value, 'id', where);
    if (!isValidSlug(id)) {
      throw new Error(`course.yaml: ${where}.id "${id}" is not a valid slug`);
    }
    if (seenModuleIds.has(id)) {
      throw new Error(`course.yaml: duplicate module id "${id}"`);
    }
    seenModuleIds.add(id);

    const moduleTitle = requireLocalized(value, 'title', lang, where);
    const moduleDescription = requireLocalized(value, 'description', lang, where);

    const rawLessons = value.lessons;
    if (!Array.isArray(rawLessons) || rawLessons.length === 0) {
      throw new Error(`course.yaml: ${where}.lessons must be a non-empty array`);
    }

    const seenSlugs = new Set<string>();
    const lessons: Lesson[] = rawLessons.map((lessonValue, lessonIndex) => {
      const lessonWhere = `${where}.lessons[${lessonIndex}]`;
      if (!isPlainObject(lessonValue)) {
        throw new Error(`course.yaml: ${lessonWhere} must be a mapping`);
      }
      const slug = requireString(lessonValue, 'slug', lessonWhere);
      if (!isValidSlug(slug)) {
        throw new Error(`course.yaml: ${lessonWhere}.slug "${slug}" is not a valid slug`);
      }
      if (seenSlugs.has(slug)) {
        throw new Error(`course.yaml: duplicate lesson slug "${slug}" in module "${id}"`);
      }
      seenSlugs.add(slug);

      const lessonTitle = requireLocalized(lessonValue, 'title', lang, lessonWhere);
      const duration = requireString(lessonValue, 'duration', lessonWhere);
      const tags = parseTags(lessonValue.tags, lessonWhere);

      return { slug, title: lessonTitle, duration, tags, hasTranslation: false };
    });

    return {
      id,
      title: moduleTitle,
      description: moduleDescription,
      lessons,
    };
  });

  const brand = parseBrand(parsed.brand, lang);

  return { title, description, basePath, repoUrl, modules, ...(brand ? { brand } : {}) };
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function parseBrand(value: unknown, lang: Lang): Brand | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    throw new Error(`course.yaml: brand must be a mapping`);
  }

  const brand: Brand = {};

  if (value.accent !== undefined) {
    brand.accent = requireHexColor(value.accent, 'brand.accent');
  }
  if (value.accentDark !== undefined) {
    brand.accentDark = requireHexColor(value.accentDark, 'brand.accentDark');
  }
  if (value.logo !== undefined) {
    brand.logo = requireScalarString(value.logo, 'brand.logo');
  }
  if (value.glyph !== undefined) {
    brand.glyph = requireScalarString(value.glyph, 'brand.glyph');
  }
  if (value.siteUrl !== undefined) {
    brand.siteUrl = requireHttpUrl(value.siteUrl, 'brand.siteUrl');
  }
  if (value.level !== undefined) {
    brand.level = requireScalarString(value.level, 'brand.level');
  }
  if (value.breadcrumbRoot !== undefined) {
    brand.breadcrumbRoot = requireLocalized(value, 'breadcrumbRoot', lang, 'brand');
  }

  if (value.hero !== undefined) {
    const hero = value.hero;
    if (!isPlainObject(hero)) {
      throw new Error(`course.yaml: brand.hero must be a mapping`);
    }
    brand.hero = {
      lead: requireLocalized(hero, 'lead', lang, 'brand.hero'),
      accent: requireLocalized(hero, 'accent', lang, 'brand.hero'),
      tail: requireLocalized(hero, 'tail', lang, 'brand.hero'),
    };
  }

  if (value.ogImage !== undefined) {
    const og = value.ogImage;
    if (!isPlainObject(og)) {
      throw new Error(`course.yaml: brand.ogImage must be a mapping`);
    }
    const ogImage: BrandOgImage = {};
    if (og.title !== undefined) {
      ogImage.title = requireLocalized(og, 'title', lang, 'brand.ogImage');
    }
    if (og.subtitle !== undefined) {
      ogImage.subtitle = requireLocalized(og, 'subtitle', lang, 'brand.ogImage');
    }
    if (og.footerTag !== undefined) {
      ogImage.footerTag = requireScalarString(og.footerTag, 'brand.ogImage.footerTag');
    }
    if (og.alt !== undefined) {
      ogImage.alt = requireLocalized(og, 'alt', lang, 'brand.ogImage');
    }
    brand.ogImage = ogImage;
  }

  return brand;
}

function requireScalarString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`course.yaml: ${where} must be a non-empty string`);
  }
  return value.trim();
}

function requireHexColor(value: unknown, where: string): string {
  const str = requireScalarString(value, where);
  if (!HEX_COLOR_RE.test(str)) {
    throw new Error(`course.yaml: ${where} "${str}" must be a hex colour (#rgb or #rrggbb)`);
  }
  return str;
}

function requireHttpUrl(value: unknown, where: string): string {
  const str = requireScalarString(value, where);
  let url: URL;
  try {
    url = new URL(str);
  } catch {
    throw new Error(`course.yaml: ${where} "${str}" must be a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`course.yaml: ${where} "${str}" must be an http(s) URL`);
  }
  return str;
}

export function findLesson(
  course: Course,
  moduleId: string,
  lessonSlug: string,
): Lesson | null {
  const mod = course.modules.find((m) => m.id === moduleId);
  if (!mod) return null;
  return mod.lessons.find((l) => l.slug === lessonSlug) ?? null;
}

export function getLessonIndex(
  course: Course,
  moduleId: string,
  slug: string,
): number {
  const flat = flattenLessons(course);
  return flat.findIndex((e) => e.moduleId === moduleId && e.lesson.slug === slug);
}

export function flattenLessons(course: Course): FlatLessonEntry[] {
  const result: FlatLessonEntry[] = [];
  let index = 0;
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      result.push({ moduleId: mod.id, lesson, index });
      index += 1;
    }
  }
  return result;
}

export function getNextLesson(
  course: Course,
  moduleId: string,
  slug: string,
): FlatLessonEntry | null {
  const flat = flattenLessons(course);
  const idx = flat.findIndex((e) => e.moduleId === moduleId && e.lesson.slug === slug);
  if (idx === -1 || idx === flat.length - 1) return null;
  return flat[idx + 1];
}

export function getPrevLesson(
  course: Course,
  moduleId: string,
  slug: string,
): FlatLessonEntry | null {
  const flat = flattenLessons(course);
  const idx = flat.findIndex((e) => e.moduleId === moduleId && e.lesson.slug === slug);
  if (idx <= 0) return null;
  return flat[idx - 1];
}

export function getTotalLessons(course: Course): number {
  let total = 0;
  for (const mod of course.modules) total += mod.lessons.length;
  return total;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  where = '<root>',
): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`course.yaml: ${where}.${key} is required and must be a non-empty string`);
  }
  return value.trim();
}

function requireLocalized(
  obj: Record<string, unknown>,
  key: string,
  lang: Lang,
  where = '<root>',
): string {
  const value = obj[key];
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      throw new Error(
        `course.yaml: ${where}.${key} is required and must be a non-empty string`,
      );
    }
    return value.trim();
  }
  if (isPlainObject(value)) {
    const ruRaw = value.ru;
    if (typeof ruRaw !== 'string' || ruRaw.trim().length === 0) {
      throw new Error(
        `course.yaml: ${where}.${key}.ru is required when ${key} is a locale map`,
      );
    }
    const target = value[lang];
    if (typeof target === 'string' && target.trim().length > 0) {
      return target.trim();
    }
    return ruRaw.trim();
  }
  throw new Error(
    `course.yaml: ${where}.${key} must be a non-empty string or a { ru, en } locale map`,
  );
}

function parseTags(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`course.yaml: ${where}.tags must be an array of strings`);
  }
  return value.map((item, i) => {
    if (typeof item !== 'string' || item.length === 0) {
      throw new Error(`course.yaml: ${where}.tags[${i}] must be a non-empty string`);
    }
    return item;
  });
}
