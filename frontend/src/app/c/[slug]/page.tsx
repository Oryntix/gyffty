import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FilterRail } from '@/components/category/filter-rail';
import { ListingToolbar, Pagination } from '@/components/category/listing-toolbar';
import { ProductCard } from '@/components/product/product-card';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { getCategories, getCategory, getFacets, getProducts } from '@/lib/catalog';
import { buildQuery } from '@/lib/api';
import type { ProductQuery } from '@/types';

/** `/c/all` is a synthetic slug meaning "the whole catalogue". */
const ALL = 'all';

type SearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function toQuery(slug: string, searchParams: SearchParams): ProductQuery {
  const num = (key: string) => {
    const raw = first(searchParams[key]);
    return raw === undefined ? undefined : Number(raw);
  };
  const bool = (key: string) => (first(searchParams[key]) === 'true' ? true : undefined);

  return {
    category: slug === ALL ? undefined : slug,
    q: first(searchParams.q),
    min_price: num('min_price'),
    max_price: num('max_price'),
    occasion: first(searchParams.occasion),
    recipient: first(searchParams.recipient),
    theme: first(searchParams.theme),
    customisable: bool('customisable'),
    same_day: bool('same_day'),
    luxe: bool('luxe'),
    bestseller: bool('bestseller'),
    new_arrival: bool('new_arrival'),
    in_stock_only: bool('in_stock_only'),
    min_rating: num('min_rating'),
    sort: first(searchParams.sort) ?? 'recommended',
    page: num('page') ?? 1,
    page_size: 24,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === ALL) {
    return { title: 'All hampers', description: 'Browse the full Gyffty hamper catalogue.' };
  }
  try {
    const category = await getCategory(slug);
    return {
      title: `${category.name} Hampers`,
      description:
        category.description ?? `Shop ${category.name.toLowerCase()} gift hampers from Gyffty.`,
    };
  } catch {
    return { title: 'Hampers' };
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  let category = null;
  if (slug !== ALL) {
    try {
      category = await getCategory(slug);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }
  }

  const query = toQuery(slug, resolvedSearch);
  const [products, facets, allCategories] = await Promise.all([
    getProducts(query),
    getFacets(slug === ALL ? undefined : slug),
    getCategories(),
  ]);

  const pillar =
    allCategories.find((c) => c.slug === slug) ??
    allCategories.find((c) => c.children.some((child) => child.slug === slug));

  const heading = category?.name ?? 'All hampers';
  const tagline = category?.tagline ?? 'Every hamper in the studio';
  const description =
    category?.description ??
    'The full Gyffty catalogue: customised boxes, festival hampers, and gifts for every relationship and milestone.';

  const baseHref = `/c/${slug}${buildQuery({ ...resolvedSearch, page: undefined })}`;

  return (
    <>
      {/* Category hero */}
      <section className="relative h-[280px] overflow-hidden bg-noir-900 sm:h-[340px]">
        <Image
          src={
            category?.hero_image ??
            `https://picsum.photos/seed/hero-${slug}-1/1920/700`
          }
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-noir-950/90 via-noir-950/60 to-noir-950/25" />
        <div className="container relative flex h-full flex-col justify-center text-bone">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-bone/60">
            <Link href="/" className="hover:text-gold-300">
              Home
            </Link>
            <span className="mx-2">/</span>
            {pillar && pillar.slug !== slug && (
              <>
                <Link href={`/c/${pillar.slug}`} className="hover:text-gold-300">
                  {pillar.name}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="text-bone/90">{heading}</span>
          </nav>
          <p className="eyebrow text-gold-400">{tagline}</p>
          <h1 className="mt-3 font-display text-display-lg">{heading}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone/70">{description}</p>
        </div>
      </section>

      {/* Sub-collection pills */}
      {pillar && pillar.children.length > 0 && (
        <div className="border-b border-line bg-white">
          <div className="container">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto py-4">
              <li>
                <Link
                  href={`/c/${pillar.slug}`}
                  className={[
                    'block shrink-0 rounded-pill border px-4 py-2 text-xs font-medium transition-colors',
                    slug === pillar.slug
                      ? 'border-noir-800 bg-noir-800 text-bone'
                      : 'border-line bg-white text-ink hover:border-noir-300',
                  ].join(' ')}
                >
                  All {pillar.name}
                </Link>
              </li>
              {pillar.children.map((child) => (
                <li key={child.slug}>
                  <Link
                    href={`/c/${child.slug}`}
                    className={[
                      'block shrink-0 rounded-pill border px-4 py-2 text-xs font-medium transition-colors',
                      slug === child.slug
                        ? 'border-noir-800 bg-noir-800 text-bone'
                        : 'border-line bg-white text-ink hover:border-noir-300',
                    ].join(' ')}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="container py-10">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <FilterRail facets={facets} className="mb-4 lg:mb-0" />

          <div>
            <ListingToolbar total={products.total} />

            {products.items.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                description="Try widening the budget, or clear a filter or two. The whole catalogue is one click away."
                action={<ButtonLink href="/c/all">Browse all hampers</ButtonLink>}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {products.items.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>
            )}

            <Pagination page={products.page} pages={products.pages} baseHref={baseHref} />
          </div>
        </div>
      </div>
    </>
  );
}
