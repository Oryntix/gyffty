'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';

import { SORT_OPTIONS } from '@/config/site';
import { cn, humanise } from '@/lib/utils';

const HIDDEN_CHIPS = new Set(['page', 'sort', 'q']);

const CHIP_LABELS: Record<string, string> = {
  same_day: 'Same-day delivery',
  customisable: 'Personalisable',
  luxe: 'LUXE',
  bestseller: 'Bestseller',
  new_arrival: 'New arrival',
  in_stock_only: 'In stock',
};

export function ListingToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const chips = [...params.entries()].filter(([key]) => !HIDDEN_CHIPS.has(key));

  const removeChip = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    // Price is set as a pair, so clearing one half clears both.
    if (key === 'min_price' || key === 'max_price') {
      next.delete('min_price');
      next.delete('max_price');
    }
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const changeSort = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const chipLabel = (key: string, value: string) => {
    if (key === 'min_price') return `Above ₹${Number(value).toLocaleString('en-IN')}`;
    if (key === 'max_price') return `Under ₹${Number(value).toLocaleString('en-IN')}`;
    if (key === 'min_rating') return `${value}★ & up`;
    if (value === 'true') return CHIP_LABELS[key] ?? humanise(key);
    return humanise(value);
  };

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">{total}</span>{' '}
          {total === 1 ? 'hamper' : 'hampers'}
        </p>

        <label className="flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">Sort by</span>
          <select
            value={params.get('sort') ?? 'recommended'}
            onChange={(event) => changeSort(event.target.value)}
            className="h-10 rounded-pill border border-line bg-white px-4 pr-8 text-sm text-ink focus:border-noir-300"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map(([key, value]) => (
            <li key={`${key}-${value}`}>
              <button
                type="button"
                onClick={() => removeChip(key)}
                className="inline-flex items-center gap-1.5 rounded-pill bg-noir-50 px-3 py-1.5 text-xs text-noir-800 transition-colors hover:bg-noir-100"
              >
                {chipLabel(key, value)}
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  baseHref,
}: {
  page: number;
  pages: number;
  baseHref: string;
}) {
  if (pages <= 1) return null;

  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );

  const hrefFor = (n: number) => {
    const [path, query = ''] = baseHref.split('?');
    const next = new URLSearchParams(query);
    next.set('page', String(n));
    return `${path}?${next.toString()}`;
  };

  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-pill border border-line px-4 py-2 text-sm hover:border-noir-800"
        >
          Previous
        </Link>
      )}
      {numbers.map((n, index) => (
        <span key={n} className="flex items-center gap-2">
          {index > 0 && n - numbers[index - 1] > 1 && (
            <span className="text-muted">…</span>
          )}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? 'page' : undefined}
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full text-sm transition-colors',
              n === page
                ? 'bg-noir-800 text-bone'
                : 'border border-line text-ink hover:border-noir-800',
            )}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-pill border border-line px-4 py-2 text-sm hover:border-noir-800"
        >
          Next
        </Link>
      )}
    </nav>
  );
}
