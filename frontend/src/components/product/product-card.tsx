'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Zap } from 'lucide-react';

import { Badge, Price, Rating } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import type { ProductCard as ProductCardType } from '@/types';

/**
 * The storefront workhorse. Hovering swaps to the second photograph and reveals
 * the add-to-bag bar, the pattern both reference sites use to keep the grid calm
 * until the shopper shows intent.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardType;
  priority?: boolean;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const wishlisted = useWishlistStore((state) => state.ids.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const primary = product.primary_image ?? product.images[0]?.url;
  const secondary = product.images[1]?.url ?? primary;
  const href = `/p/${product.slug}`;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-card bg-white shadow-card card-hover',
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-noir-50">
        <Link href={href} aria-label={product.name}>
          {primary && (
            <Image
              src={primary}
              alt={product.images[0]?.alt_text ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className="object-cover transition-opacity duration-700 ease-silk group-hover:opacity-0"
            />
          )}
          {secondary && (
            <Image
              src={secondary}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="scale-105 object-cover opacity-0 transition-all duration-700 ease-silk group-hover:scale-100 group-hover:opacity-100"
            />
          )}
        </Link>

        {/* Top-left badge stack, capped at two so the photo stays the hero. */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.is_luxe && <Badge tone="luxe">Luxe</Badge>}
          {product.discount_percent > 0 && (
            <Badge tone="sale">{product.discount_percent}% off</Badge>
          )}
          {!product.is_luxe && product.discount_percent === 0 && product.is_new_arrival && (
            <Badge tone="new">New</Badge>
          )}
        </div>

        <button
          type="button"
          onClick={() => void toggleWishlist(product.id)}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={wishlisted}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-noir-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <Heart
            className={cn('h-4 w-4', wishlisted && 'fill-blush-500 text-blush-500')}
          />
        </button>

        {product.same_day_delivery && (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-noir-700 backdrop-blur">
            <Zap className="h-3 w-3 fill-gold-400 text-gold-400" />
            Same day
          </span>
        )}

        {!product.in_stock && (
          <div className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-[1px]">
            <span className="rounded-pill bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-bone">
              Sold out
            </span>
          </div>
        )}

        {/* Slides up on hover (pointer devices); always visible on touch. */}
        <div className="absolute inset-x-3 bottom-3 translate-y-[130%] opacity-0 transition-all duration-400 ease-silk group-hover:translate-y-0 group-hover:opacity-100 max-md:translate-y-0 max-md:opacity-100">
          <button
            type="button"
            disabled={!product.in_stock || isLoading}
            onClick={() => addItem({ product_id: product.id, quantity: 1 }, product)}
            className="flex w-full items-center justify-center gap-2 rounded-pill bg-noir-800 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-bone shadow-lift transition-colors hover:bg-noir-700 disabled:opacity-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {product.in_stock ? 'Add to bag' : 'Sold out'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.is_customisable && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            Personalise this
          </span>
        )}
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        {product.rating_count > 0 && (
          <Rating value={product.rating_average} count={product.rating_count} />
        )}
        <Price
          value={product.price}
          compareAt={product.compare_at_price}
          currency={product.currency}
          className="mt-auto pt-1"
        />
      </div>
    </article>
  );
}
