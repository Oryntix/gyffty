import Image from 'next/image';

import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * The Gyffty brand marks.
 *
 * The artwork is the real foil seal, cropped square from the supplied original
 * and exported at 1024px. To replace it, overwrite public/brand/gyffty-logo.png
 * — every component reads from LOGO_SRC below, so that is the only change.
 *
 * The artwork is square (1:1) with the charcoal background baked in, so the
 * header and footer are charcoal too and the plate edge disappears into them.
 * If you later supply a transparent cut-out, set `LOGO_HAS_BACKGROUND = false`
 * and the marks will render on their own rounded charcoal plate instead.
 */
const LOGO_SRC = '/brand/gyffty-logo.png';
const LOGO_HAS_BACKGROUND = true;

/** Square seal at a fixed pixel size. Used in the header and anywhere compact. */
export function GyfftyMark({
  size = 44,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full',
        !LOGO_HAS_BACKGROUND && 'bg-noir-900 p-1.5',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={LOGO_SRC}
        alt=""
        width={size * 2}
        height={size * 2}
        priority={priority}
        sizes={`${size * 2}px`}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/** The full seal, shown large. Used in the footer and brand moments. */
export function GyfftySeal({
  size = 160,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={LOGO_SRC}
      alt={`${siteConfig.name} — ${siteConfig.tagline}`}
      width={size}
      height={size}
      sizes={`${size * 2}px`}
      className={cn('rounded-full', className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Mark plus wordmark, laid out horizontally — what the header uses.
 *
 * The seal already contains the word GYFFTY, but it is unreadable below about
 * 90px, so the mark carries the monogram and a live text wordmark sits beside
 * it. That also keeps the brand name selectable and readable to screen readers.
 */
export function GyfftyLogo({
  className,
  size = 44,
  priority = false,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <span className={cn('flex shrink-0 items-center gap-3', className)}>
      <GyfftyMark size={size} priority={priority} />
      <span className="flex flex-col leading-none">
        <span className="text-foil font-display text-[26px] tracking-[0.16em]">
          {siteConfig.name.toUpperCase()}
        </span>
        <span className="mt-1.5 hidden text-[8px] uppercase tracking-[0.26em] text-bone/45 sm:block">
          {siteConfig.productLines.join(' · ')}
        </span>
      </span>
    </span>
  );
}
