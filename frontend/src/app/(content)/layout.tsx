import Link from 'next/link';

/**
 * Shared shell for the static content pages — policies, help and company.
 * A route group, so it adds a layout without appearing in any URL.
 */
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-14">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted">
        <Link href="/" className="hover:text-noir-800">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Information</span>
      </nav>

      <article className="prose-gyffty mx-auto max-w-3xl">{children}</article>

      <div className="mx-auto mt-16 max-w-3xl border-t border-line pt-8">
        <p className="text-sm text-muted">
          Still need a hand?{' '}
          <Link href="/help/contact" className="text-gold-600 underline">
            Talk to the studio
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
