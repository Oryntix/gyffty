'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { PillarNav } from '@/config/site';

/**
 * Full-width dropdown, opened on hover of a pillar. Three columns: the
 * collections under that pillar, cross-cutting shortcuts, and an editorial tile.
 */
export function MegaMenu({
  pillar,
  onClose,
}: {
  pillar: PillarNav | null;
  onClose: () => void;
}) {
  if (!pillar) return null;

  return (
    <div
      className="absolute inset-x-0 top-full hidden animate-fade-up border-t border-line bg-white shadow-lift lg:block"
      onMouseLeave={onClose}
    >
      <div className="container grid grid-cols-12 gap-10 py-10">
        <div className="col-span-3">
          <p className="eyebrow mb-3">{pillar.tagline}</p>
          <h3 className="font-display text-3xl text-noir-900">{pillar.name}</h3>
          <p className="mt-4 text-sm leading-relaxed text-muted">{pillar.blurb}</p>
          <Link
            href={`/c/${pillar.slug}`}
            onClick={onClose}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-noir-800 hover:text-gold-600"
          >
            Shop all {pillar.name.toLowerCase()}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="col-span-3">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Collections
          </p>
          <ul className="space-y-1">
            {pillar.collections.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="group flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-ink transition-colors hover:bg-noir-50 hover:text-noir-800"
                >
                  {item.label}
                  <span
                    aria-hidden
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="col-span-3">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Quick picks
          </p>
          <ul className="space-y-1">
            {pillar.shortcuts.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-noir-50 hover:text-noir-800"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href={`/c/${pillar.slug}`}
          onClick={onClose}
          className="group relative col-span-3 overflow-hidden rounded-card"
        >
          <Image
            src={`https://picsum.photos/seed/tile-${pillar.slug}-1/600/600`}
            alt=""
            width={600}
            height={600}
            className="h-full w-full object-cover transition-transform duration-700 ease-silk group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-noir-950/80 via-noir-950/10 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-bone">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-300">
              Featured
            </p>
            <p className="mt-1.5 font-display text-xl">{pillar.tagline}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
