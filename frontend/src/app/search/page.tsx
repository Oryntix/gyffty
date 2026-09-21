import type { Metadata } from 'next';

import { ListingToolbar, Pagination } from '@/components/category/listing-toolbar';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { buildQuery } from '@/lib/api';
import { getProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const query = (Array.isArray(resolved.q) ? resolved.q[0] : resolved.q) ?? '';
  const page = Number(resolved.page ?? 1);
  const sort = (Array.isArray(resolved.sort) ? resolved.sort[0] : resolved.sort) ?? 'recommended';

  const results = query
    ? await getProducts({ q: query, sort, page, page_size: 24 })
    : { items: [], total: 0, page: 1, page_size: 24, pages: 0 };

  return (
    <div className="container py-12">
      <p className="eyebrow">Search</p>
      <h1 className="mt-3 font-display text-display-md text-noir-900">
        {query ? `Results for “${query}”` : 'Search hampers'}
      </h1>

      {!query ? (
        <p className="mt-4 text-sm text-muted">
          Type a hamper name, an occasion or a recipient in the search bar above.
        </p>
      ) : results.items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No hampers match that"
            description="Try a broader term — an occasion like “diwali”, a recipient like “for him”, or something inside the box like “chocolate”."
            action={<ButtonLink href="/c/all">Browse all hampers</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-8">
          <ListingToolbar total={results.total} />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {results.items.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
          <Pagination
            page={results.page}
            pages={results.pages}
            baseHref={`/search${buildQuery({ q: query, sort })}`}
          />
        </div>
      )}
    </div>
  );
}
