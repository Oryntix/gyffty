'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProductFacets } from '@/types';

/**
 * Every filter lives in the URL, so a filtered listing is shareable, indexable
 * and survives a refresh. This component only ever rewrites the query string.
 */
export function FilterRail({
  facets,
  className,
}: {
  facets: ProductFacets;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || next.get(key) === value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete('page'); // any filter change resets pagination
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const setPriceRange = useCallback(
    (min: number, max: number | null) => {
      const next = new URLSearchParams(params.toString());
      const alreadyActive =
        next.get('min_price') === String(min) &&
        (max === null ? !next.get('max_price') : next.get('max_price') === String(max));

      if (alreadyActive) {
        next.delete('min_price');
        next.delete('max_price');
      } else {
        next.set('min_price', String(min));
        if (max === null) next.delete('max_price');
        else next.set('max_price', String(max));
      }
      next.delete('page');
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearAll = () => router.push(pathname, { scroll: false });

  const activeCount = [...params.keys()].filter(
    (key) => !['page', 'sort', 'q'].includes(key),
  ).length;

  const isPriceActive = (min: number, max: number | null) =>
    params.get('min_price') === String(min) &&
    (max === null ? !params.get('max_price') : params.get('max_price') === String(max));

  const toggles = [
    { key: 'same_day', label: 'Same-day delivery' },
    { key: 'customisable', label: 'Can be personalised' },
    { key: 'luxe', label: 'LUXE collection' },
    { key: 'bestseller', label: 'Bestsellers' },
    { key: 'new_arrival', label: 'New arrivals' },
    { key: 'in_stock_only', label: 'In stock only' },
  ];

  const body = (
    <div className="space-y-8">
      <FilterGroup title="Delivery & type">
        <div className="space-y-2.5">
          {toggles.map((toggle) => (
            <label
              key={toggle.key}
              className="flex cursor-pointer items-center gap-3 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={params.get(toggle.key) === 'true'}
                onChange={() =>
                  setParam(toggle.key, params.get(toggle.key) === 'true' ? null : 'true')
                }
                className="h-4 w-4 rounded border-line text-noir-800 accent-noir-800"
              />
              {toggle.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      {facets.price_buckets.length > 0 && (
        <FilterGroup title="Budget">
          <div className="space-y-2.5">
            {facets.price_buckets.map((bucket) => (
              <label
                key={bucket.label}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 text-sm',
                  bucket.count === 0 ? 'text-muted/50' : 'text-ink',
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={bucket.count === 0}
                    checked={isPriceActive(bucket.min_price, bucket.max_price)}
                    onChange={() => setPriceRange(bucket.min_price, bucket.max_price)}
                    className="h-4 w-4 rounded border-line accent-noir-800"
                  />
                  {bucket.label}
                </span>
                <span className="text-xs text-muted">{bucket.count}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      <FacetGroup
        title="Recipient"
        facetKey="recipient"
        values={facets.recipients}
        params={params}
        onToggle={setParam}
      />
      <FacetGroup
        title="Occasion"
        facetKey="occasion"
        values={facets.occasions}
        params={params}
        onToggle={setParam}
      />
      <FacetGroup
        title="Inside the hamper"
        facetKey="theme"
        values={facets.themes}
        params={params}
        onToggle={setParam}
      />

      <FilterGroup title="Rating">
        <div className="flex flex-wrap gap-2">
          {[4.5, 4, 3.5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setParam('min_rating', String(rating))}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-xs transition-colors',
                params.get('min_rating') === String(rating)
                  ? 'border-noir-800 bg-noir-800 text-bone'
                  : 'border-line bg-white text-ink hover:border-noir-300',
              )}
            >
              {rating}★ & up
            </button>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className={cn('lg:hidden', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="w-full"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 bg-noir-950/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-slide-in-right flex-col bg-bone">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xl text-noir-900">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5 text-noir-800" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">{body}</div>
            <div className="flex gap-2 border-t border-line p-4">
              <Button variant="outline" fullWidth onClick={clearAll}>
                Clear all
              </Button>
              <Button fullWidth onClick={() => setMobileOpen(false)}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside className={cn('hidden lg:block', className)} aria-label="Product filters">
        <div className="sticky top-[200px]">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Refine
            </h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gold-600 hover:underline"
              >
                Clear all ({activeCount})
              </button>
            )}
          </div>
          {body}
        </div>
      </aside>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-noir-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FacetGroup({
  title,
  facetKey,
  values,
  params,
  onToggle,
}: {
  title: string;
  facetKey: string;
  values: { value: string; label: string; count: number }[];
  params: URLSearchParams;
  onToggle: (key: string, value: string | null) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (values.length === 0) return null;
  const visible = showAll ? values : values.slice(0, 6);

  return (
    <FilterGroup title={title}>
      <div className="flex flex-wrap gap-2">
        {visible.map((facet) => (
          <button
            key={facet.value}
            type="button"
            onClick={() => onToggle(facetKey, facet.value)}
            className={cn(
              'rounded-pill border px-3 py-1.5 text-xs transition-colors',
              params.get(facetKey) === facet.value
                ? 'border-noir-800 bg-noir-800 text-bone'
                : 'border-line bg-white text-ink hover:border-noir-300',
            )}
          >
            {facet.label}
            <span className="ml-1.5 text-[10px] opacity-60">{facet.count}</span>
          </button>
        ))}
      </div>
      {values.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-3 text-xs text-gold-600 hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${values.length}`}
        </button>
      )}
    </FilterGroup>
  );
}
