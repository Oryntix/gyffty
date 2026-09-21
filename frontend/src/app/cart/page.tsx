'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

/** Full-page cart. The drawer covers the quick path; this one is linkable. */
export default function CartPage() {
  const { cart, refresh, updateItem, removeItem, isLoading } = useCartStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const items = cart?.items ?? [];
  const totals = cart?.totals;

  return (
    <div className="container py-12">
      <h1 className="font-display text-display-md text-noir-900 gold-rule">Your bag</h1>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing in the bag yet"
            description="Browse the bestsellers, or start a hamper from scratch and fill it yourself."
            action={<ButtonLink href="/c/all">Browse hampers</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex gap-5 py-6 first:pt-0">
                <Link
                  href={`/p/${item.product.slug}`}
                  className="relative h-32 w-28 shrink-0 overflow-hidden rounded-card bg-noir-50"
                >
                  {item.product.primary_image && (
                    <Image
                      src={item.product.primary_image}
                      alt={item.product.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/p/${item.product.slug}`}
                    className="text-base font-medium text-ink hover:text-noir-700"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted">{item.product.sku}</p>

                  {item.recipient_name && (
                    <p className="mt-2 text-xs text-muted">For {item.recipient_name}</p>
                  )}
                  {item.gift_message && (
                    <p className="mt-1 text-xs italic text-muted">
                      &ldquo;{item.gift_message}&rdquo;
                    </p>
                  )}
                  {item.engraving_text && (
                    <p className="mt-1 text-xs text-gold-600">
                      Engraved: {item.engraving_text}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center rounded-pill border border-line bg-white">
                      <button
                        type="button"
                        disabled={isLoading || item.quantity <= 1}
                        onClick={() => updateItem(item.id, { quantity: item.quantity - 1 })}
                        aria-label="Decrease quantity"
                        className="grid h-9 w-9 place-items-center disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                        aria-label="Increase quantity"
                        className="grid h-9 w-9 place-items-center disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-semibold">
                        {formatPrice(item.line_total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.product.name}`}
                        className="text-muted transition-colors hover:text-blush-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {totals && (
            <aside className="lg:sticky lg:top-[200px] lg:self-start">
              <div className="rounded-card border border-line bg-white p-6">
                <h2 className="font-display text-xl text-noir-900">Summary</h2>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Subtotal</dt>
                    <dd className="font-medium">{formatPrice(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Shipping</dt>
                    <dd className="font-medium">
                      {totals.shipping_fee === 0 ? 'Free' : formatPrice(totals.shipping_fee)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">GST (18%)</dt>
                    <dd className="font-medium">{formatPrice(totals.tax_total)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-3 text-base">
                    <dt className="font-display text-lg text-noir-900">Total</dt>
                    <dd className="font-semibold">{formatPrice(totals.grand_total)}</dd>
                  </div>
                </dl>

                {totals.amount_to_free_shipping > 0 && (
                  <p className="mt-4 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold-800">
                    Add {formatPrice(totals.amount_to_free_shipping)} more for free shipping.
                  </p>
                )}

                <ButtonLink href="/checkout" size="lg" fullWidth className="mt-6">
                  Checkout
                </ButtonLink>
                <ButtonLink href="/c/all" variant="ghost" fullWidth className="mt-1">
                  Continue shopping
                </ButtonLink>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
