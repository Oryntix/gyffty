'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

import { Button, ButtonLink } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

export function CartDrawer() {
  const { cart, isOpen, isLoading, error, closeDrawer, updateItem, removeItem, dismissError } =
    useCartStore();

  if (!isOpen) return null;

  const items = cart?.items ?? [];
  const totals = cart?.totals;
  const progress = totals
    ? Math.min(100, (totals.subtotal / totals.free_shipping_threshold) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label="Shopping bag">
      <div
        className="absolute inset-0 bg-noir-950/45 backdrop-blur-sm"
        onClick={closeDrawer}
        aria-hidden
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in-right flex-col bg-bone shadow-lift">
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-2xl text-noir-900">Your bag</h2>
            <p className="text-xs text-muted">
              {cart?.item_count ?? 0} {cart?.item_count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close bag"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-noir-50"
          >
            <X className="h-5 w-5 text-noir-800" />
          </button>
        </header>

        {/* Free-shipping nudge */}
        {totals && totals.subtotal > 0 && (
          <div className="border-b border-line bg-white px-6 py-4">
            {totals.amount_to_free_shipping > 0 ? (
              <p className="text-xs text-muted">
                Add{' '}
                <strong className="text-noir-800">
                  {formatPrice(totals.amount_to_free_shipping)}
                </strong>{' '}
                more for free shipping
              </p>
            ) : (
              <p className="text-xs font-medium text-noir-700">
                You have unlocked free shipping
              </p>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-line">
              <div
                className="h-full rounded-pill bg-gradient-to-r from-noir-600 to-gold-500 transition-all duration-700 ease-silk"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start justify-between gap-3 bg-blush-100 px-6 py-3 text-xs text-blush-500">
            <span>{error}</span>
            <button type="button" onClick={dismissError} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-line" />
              <p className="mt-4 font-display text-xl text-noir-900">Your bag is empty</p>
              <p className="mt-2 max-w-xs text-sm text-muted">
                Start with a bestseller, or build a hamper from scratch.
              </p>
              <ButtonLink href="/c/customised" onClick={closeDrawer} className="mt-6">
                Build a hamper
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4">
                  <Link
                    href={`/p/${item.product.slug}`}
                    onClick={closeDrawer}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-noir-50"
                  >
                    {item.product.primary_image && (
                      <Image
                        src={item.product.primary_image}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/p/${item.product.slug}`}
                      onClick={closeDrawer}
                      className="line-clamp-2 text-sm font-medium text-ink hover:text-noir-700"
                    >
                      {item.product.name}
                    </Link>
                    {item.recipient_name && (
                      <p className="mt-0.5 text-[11px] text-muted">For {item.recipient_name}</p>
                    )}
                    {item.engraving_text && (
                      <p className="text-[11px] text-gold-600">
                        Engraved: {item.engraving_text}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-pill border border-line bg-white">
                        <button
                          type="button"
                          disabled={isLoading || item.quantity <= 1}
                          onClick={() => updateItem(item.id, { quantity: item.quantity - 1 })}
                          aria-label="Decrease quantity"
                          className="grid h-8 w-8 place-items-center text-noir-800 disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                          aria-label="Increase quantity"
                          className="grid h-8 w-8 place-items-center text-noir-800 disabled:opacity-40"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
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
          )}
        </div>

        {items.length > 0 && totals && (
          <footer className="border-t border-line bg-white px-6 py-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium">{formatPrice(totals.subtotal)}</dd>
              </div>
              {totals.discount_total > 0 && (
                <div className="flex justify-between text-noir-700">
                  <dt>Discount</dt>
                  <dd>-{formatPrice(totals.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-medium">
                  {totals.shipping_fee === 0 ? 'Free' : formatPrice(totals.shipping_fee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">GST</dt>
                <dd className="font-medium">{formatPrice(totals.tax_total)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-base">
                <dt className="font-display text-lg text-noir-900">Total</dt>
                <dd className="font-semibold">{formatPrice(totals.grand_total)}</dd>
              </div>
            </dl>

            <ButtonLink
              href="/checkout"
              onClick={closeDrawer}
              size="lg"
              fullWidth
              className="mt-5"
            >
              Checkout
            </ButtonLink>
            <Button
              variant="ghost"
              fullWidth
              onClick={closeDrawer}
              className="mt-1 text-xs uppercase tracking-[0.14em]"
            >
              Continue shopping
            </Button>
          </footer>
        )}
      </aside>
    </div>
  );
}
