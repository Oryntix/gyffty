import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, PackageCheck, RotateCcw, Truck } from 'lucide-react';

import { AddToBag } from '@/components/product/add-to-bag';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductRail } from '@/components/product/product-rail';
import { Badge, Price, Rating } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import {
  getProduct,
  getRatingSummary,
  getRelatedProducts,
  getReviews,
} from '@/lib/catalog';
import { formatDate, humanise, parseTags } from '@/lib/utils';
import { siteConfig } from '@/config/site';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.short_description ?? undefined,
      openGraph: {
        title: product.name,
        description: product.short_description ?? undefined,
        images: product.primary_image ? [product.primary_image] : undefined,
      },
    };
  } catch {
    return { title: 'Hamper' };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [related, reviews, ratings] = await Promise.all([
    getRelatedProducts(slug, 8),
    getReviews(slug),
    getRatingSummary(slug),
  ]);

  const occasions = parseTags(product.occasion_tags);
  const recipients = parseTags(product.recipient_tags);
  const themes = parseTags(product.theme_tags);

  // Rich result for the product, so the listing can surface price and rating.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description ?? product.description ?? undefined,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: product.in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(ratings.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratings.average,
        reviewCount: ratings.count,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container py-8">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted">
          <Link href="/" className="hover:text-noir-800">
            Home
          </Link>
          <span className="mx-2">/</span>
          {product.category && (
            <>
              <Link href={`/c/${product.category.slug}`} className="hover:text-noir-800">
                {product.category.name}
              </Link>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={product} />

          <div>
            {product.category && (
              <Link
                href={`/c/${product.category.slug}`}
                className="eyebrow hover:text-gold-500"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="mt-3 font-display text-display-md text-noir-900">
              {product.name}
            </h1>

            {product.rating_count > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <Rating value={product.rating_average} size="md" showCount={false} />
                <a href="#reviews" className="text-sm text-muted hover:text-noir-800">
                  {product.rating_average.toFixed(1)} · {product.rating_count} reviews
                </a>
              </div>
            )}

            {product.short_description && (
              <p className="mt-5 text-[15px] leading-relaxed text-muted">
                {product.short_description}
              </p>
            )}

            <div className="mt-7 border-y border-line py-5">
              <Price
                value={product.price}
                compareAt={product.compare_at_price}
                currency={product.currency}
                size="lg"
              />
              <p className="mt-1.5 text-xs text-muted">Inclusive of all taxes</p>
            </div>

            <div className="mt-7">
              <AddToBag product={product} />
            </div>

            {/* What's inside */}
            {product.inclusions.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-2xl text-noir-900 gold-rule">
                  What is inside
                </h2>
                <ul className="mt-6 space-y-3">
                  {product.inclusions.map((inclusion) => (
                    <li key={inclusion.id} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                      <span className="text-ink">
                        {inclusion.name}
                        {inclusion.quantity && (
                          <span className="text-muted"> — {inclusion.quantity}</span>
                        )}
                        {inclusion.note && (
                          <span className="block text-xs text-muted">{inclusion.note}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {product.description && (
              <section className="mt-10">
                <h2 className="font-display text-2xl text-noir-900 gold-rule">
                  About this hamper
                </h2>
                <p className="mt-6 text-[15px] leading-relaxed text-muted">
                  {product.description}
                </p>
              </section>
            )}

            {/* Service promises */}
            <dl className="mt-10 grid gap-5 sm:grid-cols-3">
              {[
                { icon: Truck, title: 'Delivery', body: 'Free above ₹1,999, ₹99 below' },
                { icon: PackageCheck, title: 'Packed by hand', body: 'Assembled in Bengaluru' },
                { icon: RotateCcw, title: 'Damaged?', body: 'One photo and we remake it' },
              ].map((promise) => (
                <div key={promise.title} className="flex gap-3">
                  <promise.icon className="h-5 w-5 shrink-0 text-gold-600" strokeWidth={1.5} />
                  <div>
                    <dt className="text-xs font-semibold text-noir-900">{promise.title}</dt>
                    <dd className="mt-0.5 text-xs text-muted">{promise.body}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Facet links, useful for shoppers and for internal linking */}
            {(occasions.length > 0 || recipients.length > 0 || themes.length > 0) && (
              <div className="mt-10 space-y-4 border-t border-line pt-8">
                <TagRow label="Occasions" tags={occasions} facetKey="occasion" />
                <TagRow label="Perfect for" tags={recipients} facetKey="recipient" />
                <TagRow label="Inside" tags={themes} facetKey="theme" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="border-t border-line bg-white py-16">
        <div className="container grid gap-12 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="eyebrow">Reviews</p>
            <h2 className="mt-3 font-display text-display-md text-noir-900">
              {ratings.count > 0 ? ratings.average.toFixed(1) : '—'}
              <span className="text-2xl text-muted"> / 5</span>
            </h2>
            <Rating value={ratings.average} showCount={false} size="md" className="mt-3" />
            <p className="mt-2 text-sm text-muted">
              Based on {ratings.count} verified {ratings.count === 1 ? 'review' : 'reviews'}
            </p>

            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratings.distribution[String(star)] ?? 0;
                const percent = ratings.count ? (count / ratings.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-6 text-muted">{star}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
                      <div
                        className="h-full rounded-pill bg-gold-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-6 text-right tabular-nums text-muted">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            {reviews.items.length === 0 ? (
              <p className="text-sm text-muted">
                No reviews yet. Yours would be the first.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {reviews.items.map((review) => (
                  <li key={review.id} className="py-6 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <Rating value={review.rating} showCount={false} />
                      {review.is_verified_purchase && (
                        <Badge tone="same-day">Verified purchase</Badge>
                      )}
                    </div>
                    {review.title && (
                      <h3 className="mt-3 text-base font-medium text-ink">{review.title}</h3>
                    )}
                    {review.body && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">{review.body}</p>
                    )}
                    <p className="mt-3 text-xs text-muted">
                      {review.author_name} · {formatDate(review.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <ProductRail
        eyebrow="You might also like"
        title="More from this collection"
        products={related}
      />
    </>
  );
}

function TagRow({
  label,
  tags,
  facetKey,
}: {
  label: string;
  tags: string[];
  facetKey: string;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted">{label}:</span>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/c/all?${facetKey}=${encodeURIComponent(tag)}`}
          className="rounded-pill border border-line px-3 py-1 text-xs text-ink transition-colors hover:border-noir-800"
        >
          {humanise(tag)}
        </Link>
      ))}
    </div>
  );
}
