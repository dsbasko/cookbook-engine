import Link from 'next/link';

// Root not-found is the fallback used when no lang segment matches. Always
// rendered in DEFAULT_LANG; per-lang copies live at `not-found-lang.tsx`.
export default function NotFound() {
  return (
    <main
      style={{
        maxWidth: 'var(--layout-content-max)',
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--content-secondary)',
          marginBottom: 'var(--space-6)',
        }}
      >
        That lesson is not part of the course. Head back to the home page.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: 'var(--space-3) var(--space-6)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-main)',
          color: 'var(--content-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
        }}
      >
        Go home
      </Link>
    </main>
  );
}
