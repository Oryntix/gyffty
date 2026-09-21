import Link from 'next/link';
import { Star } from 'lucide-react';

import { cn, formatPrice } from '@/lib/utils';

/* ------------------------------------------------------------------ badges */

type BadgeTone = 'luxe' | 'sale' | 'new' | 'same-day' | 'custom' | 'neutral';

const BADGE_TONES: Record<BadgeTone, string> = {
  luxe: 'bg-noir-800 text-gold-300',
  sale: 'bg-blush-500 text-white',
  new: 'bg-gold-100 text-gold-800',
  'same-day': 'bg-noir-50 text-noir-700 border border-noir-200',
  custom: 'bg-white/90 text-noir-800 border border-gold-300',
  neutral: 'bg-line text-muted',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ rating */

export function Rating({
  value,
  count,
  size = 'sm',
  showCount = true,
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  className?: string;
}) {
  const dimension = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              dimension,
              star <= Math.round(value)
                ? 'fill-gold-400 text-gold-400'
                : 'fill-line text-line',
            )}
          />
        ))}
      </div>
      <span className="sr-only">{value} out of 5</span>
      {showCount && (
        <span className="text-xs text-muted">
          {value.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- price */

export function Price({
  value,
  compareAt,
  currency = 'INR',
  size = 'md',
  className,
}: {
  value: number;
  compareAt?: number | null;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const showCompare = !!compareAt && compareAt > value;
  const sizes = {
    sm: 'text-sm',
    md: 'text-[15px]',
    lg: 'text-2xl',
  } as const;

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      <span className={cn('font-semibold text-ink', sizes[size])}>
        {formatPrice(value, currency)}
      </span>
      {showCompare && (
        <>
          <span className="text-xs text-muted line-through">
            {formatPrice(compareAt!, currency)}
          </span>
          <span className="text-xs font-semibold text-blush-500">
            {Math.round(((compareAt! - value) / compareAt!) * 100)}% off
          </span>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- headings */

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = 'View all',
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2
          className={cn(
            'font-display text-display-md text-noir-900',
            align === 'left' && 'gold-rule',
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-noir-800 transition-colors hover:text-gold-600"
        >
          {hrefLabel}
          <span
            aria-hidden
            className="transition-transform duration-300 ease-silk group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- skeletons */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] w-full rounded-card" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

/* ------------------------------------------------------------- empty state */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-white/60 px-6 py-20 text-center">
      <h3 className="font-display text-2xl text-noir-900">{title}</h3>
      <p className="mt-3 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
