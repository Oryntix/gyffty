import Image from 'next/image';
import Link from 'next/link';

import { SectionHeading } from '@/components/ui/primitives';
import { PILLARS } from '@/config/site';
import type { CategoryTree } from '@/types';

/**
 * The five pillars as editorial tiles. The first spans two columns on desktop so
 * the grid reads as a composition rather than a row of equal boxes.
 */
export function PillarTiles({ categories }: { categories: CategoryTree[] }) {
  const counts = new Map(categories.map((c) => [c.slug, c.product_count]));

  return (
    <section className="py-16 sm:py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Start here"
          title="Four ways to choose"
          description="Customise it yourself, shop by who is opening it, by the festival on the calendar, or by the milestone you are marking."
          align="center"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {PILLARS.map((pillar, index) => {
            const featured = index === 0;
            return (
              <Link
                key={pillar.slug}
                href={`/c/${pillar.slug}`}
                className={[
                  'group relative overflow-hidden rounded-card bg-noir-900',
                  featured ? 'lg:col-span-1 lg:row-span-2 min-h-[280px] lg:min-h-full' : 'min-h-[240px]',
                ].join(' ')}
              >
                <Image
                  src={`https://picsum.photos/seed/tile-${pillar.slug}-1/800/${featured ? 1200 : 700}`}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-[900ms] ease-silk group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir-950/88 via-noir-950/25 to-transparent" />

                <div className="absolute inset-x-6 bottom-6 text-bone">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: pillar.accent }}
                  >
                    {pillar.tagline}
                  </p>
                  <h3
                    className={[
                      'mt-2 font-display',
                      featured ? 'text-4xl sm:text-5xl' : 'text-3xl',
                    ].join(' ')}
                  >
                    {pillar.name}
                  </h3>
                  <p className="mt-2 text-xs text-bone/60">
                    {counts.get(pillar.slug) ?? 0} hampers
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gold-300">
                    Shop now
                    <span
                      aria-hidden
                      className="transition-transform duration-300 ease-silk group-hover:translate-x-1.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
