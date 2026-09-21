'use client';

import Image from 'next/image';
import { useState } from 'react';

import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { ProductDetail } from '@/types';

export function ProductGallery({ product }: { product: ProductDetail }) {
  const images = product.images.length
    ? product.images
    : [{ id: 0, url: '', alt_text: product.name, display_order: 0, is_primary: true }];
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      <div className="no-scrollbar flex gap-3 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-visible">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`View image ${index + 1}`}
            aria-current={index === active}
            className={cn(
              'relative aspect-square w-16 shrink-0 overflow-hidden rounded-md bg-noir-50 ring-1 transition-all lg:w-full',
              index === active ? 'ring-2 ring-noir-800' : 'ring-line hover:ring-noir-300',
            )}
          >
            {image.url && (
              <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
            )}
          </button>
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden rounded-card bg-noir-50">
        <div className="relative aspect-[4/5]">
          {images[active]?.url && (
            <Image
              src={images[active].url}
              alt={images[active].alt_text ?? product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {product.is_luxe && <Badge tone="luxe">Luxe</Badge>}
          {product.discount_percent > 0 && (
            <Badge tone="sale">{product.discount_percent}% off</Badge>
          )}
          {product.is_new_arrival && <Badge tone="new">New</Badge>}
        </div>
      </div>
    </div>
  );
}
