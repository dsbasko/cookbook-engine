// Public barrel for @dsbasko/cookbook-engine.
//
// Course consumers normally use the dedicated entry-points
// (`/config`, `/layout/*`, `/pages/*`, `/og/*`, `/seo/*`, `/styles/*`). This
// barrel is the escape hatch for advanced cases: composing custom layouts or
// pages on top of the engine's components and lib helpers.

export const ENGINE_PACKAGE_NAME = '@dsbasko/cookbook-engine';

// --- lib: course model + loading -------------------------------------------
export * from './lib/course';
export * from './lib/course-loader';
export * from './lib/lesson';
export * from './lib/lang';
export * from './lib/use-i18n';
export * from './lib/i18n';

// --- lib: content rendering -------------------------------------------------
export * from './lib/markdown';
export * from './lib/extract-toc';
export * from './lib/readme-toc';
export * from './lib/slug';
export * from './lib/format';
export * from './lib/description';
export * from './lib/frontier-link';

// --- lib: client state (theme / progress / reading prefs / gating) ----------
export * from './lib/theme';
export * from './lib/progress';
export * from './lib/progress-mode';
export * from './lib/reading-prefs';
export * from './lib/lesson-gate';
export * from './lib/program-drawer';

// --- lib: SEO ---------------------------------------------------------------
export * from './lib/site-url';
export * from './lib/sitemap';

// --- components -------------------------------------------------------------
export { AppShell } from './components/AppShell';
export { Header } from './components/Header';
export { Sidebar } from './components/Sidebar';
export { HomePage } from './components/HomePage';
export { ModulePage } from './components/ModulePage';
export { Toc } from './components/Toc';
export { CodeBlock } from './components/CodeBlock';
export { Callout } from './components/Callout';
export { LessonNav } from './components/LessonNav';
export { LessonLayout } from './components/LessonLayout';
export { LessonPageLayout } from './components/LessonPageLayout';
export { LessonSideMeta } from './components/LessonSideMeta';
export { LessonAwareLink } from './components/LessonAwareLink';
export { LessonLockedInterstitial } from './components/LessonLockedInterstitial';
export { ProgramDrawer } from './components/ProgramDrawer';
export { ProgressBar } from './components/ProgressBar';
export { ReadingProgress } from './components/ReadingProgress';
export { SettingsToggle } from './components/SettingsToggle';
export { TranslationBanner } from './components/TranslationBanner';
export { GateProvider } from './components/GateProvider';
export { ThemeProvider } from './components/ThemeProvider';
export { ProgressModeProvider } from './components/ProgressModeProvider';
export { ReadingPrefsProvider } from './components/ReadingPrefsProvider';
