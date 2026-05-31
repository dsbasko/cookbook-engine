import type { ReactNode } from 'react';
import { DEFAULT_BRAND_NAME } from '@/lib/course';
import { getDict } from '@/lib/i18n';
import { type Lang } from '@/lib/lang';
import styles from './Header.module.css';

type HeaderProps = {
  lang: Lang;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  brandRoot?: string;
};

export function Header({ lang, breadcrumbs, actions, brandRoot = DEFAULT_BRAND_NAME }: HeaderProps) {
  const t = getDict(lang);
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.breadcrumbs} aria-label={t.breadcrumbsLabel}>
          {breadcrumbs ?? <span className={styles.breadcrumbRoot}>{brandRoot}</span>}
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
    </header>
  );
}
