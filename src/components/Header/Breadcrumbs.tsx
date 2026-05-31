import Link from 'next/link';
import { DEFAULT_BRAND_NAME } from '@/lib/course';
import type { Lang } from '@/lib/lang';
import styles from './Header.module.css';

type BreadcrumbsProps = {
  lang: Lang;
  moduleId?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  brandRoot?: string;
};

export function Breadcrumbs({
  lang,
  moduleId,
  moduleTitle,
  lessonTitle,
  brandRoot = DEFAULT_BRAND_NAME,
}: BreadcrumbsProps) {
  if (!moduleId || !moduleTitle) {
    return <span className={styles.breadcrumbRoot}>{brandRoot}</span>;
  }

  return (
    <>
      <Link href={`/${lang}`} className={styles.breadcrumbLink}>
        {brandRoot}
      </Link>
      <span className={styles.breadcrumbSeparator} aria-hidden="true">
        /
      </span>
      {lessonTitle ? (
        <Link href={`/${lang}/${moduleId}`} className={styles.breadcrumbLink}>
          {moduleTitle}
        </Link>
      ) : (
        <span className={styles.breadcrumbCurrent}>{moduleTitle}</span>
      )}
      {lessonTitle && (
        <>
          <span className={styles.breadcrumbSeparator} aria-hidden="true">
            /
          </span>
          <span className={styles.breadcrumbCurrent}>{lessonTitle}</span>
        </>
      )}
    </>
  );
}
