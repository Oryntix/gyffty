'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ProductCard } from '@/components/product/product-card';
import { SectionHeading } from '@/components/ui/primitives';
import type { ProductCard as ProductCardType } from '@/types';

/** Horizontal carousel used for every homepage product row. */
export function ProductRail({
  eyebrow,
  title,
  description,
  href,
  products,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  products: ProductCardType[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    // Advance by roughly one card, so the next one is always partly visible.
    track.scrollBy({ left: direction * (track.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="py-14 sm:py-20">
      <div className="container">
        <div className="relative">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            href={href}
          />

          <div className="absolute -top-1 right-0 hidden gap-2 lg:flex">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => scrollBy(direction)}
                aria-label={direction === -1 ? 'Scroll left' : 'Scroll right'}
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-noir-800 transition-colors hover:border-noir-800 hover:bg-noir-800 hover:text-bone"
              >
                {direction === -1 ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 sm:gap-6"
        >
          {products.map((product, index) => (
            <div
              key={product.id}
              className="w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-[31%] xl:w-[23.5%]"
            >
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
