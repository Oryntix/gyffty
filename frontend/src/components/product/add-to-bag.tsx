'use client';

import { useState } from 'react';
import { Check, Gift, Minus, Plus, ShoppingBag, Truck, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import type { ProductDetail } from '@/types';

const MESSAGE_LIMIT = 300;
const ENGRAVING_LIMIT = 24;

/**
 * Quantity, personalisation and the add-to-bag action.
 *
 * The personalisation fields are collected here rather than at checkout because
 * they are per-line, not per-order: one bag can hold two hampers going to two
 * different people with two different messages.
 */
export function AddToBag({ product }: { product: ProductDetail }) {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);

  const [quantity, setQuantity] = useState(1);
  const [showPersonalisation, setShowPersonalisation] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [engravingText, setEngravingText] = useState('');
  const [added, setAdded] = useState(false);

  const maxQuantity = Math.min(product.stock_quantity, 20);
  const lowStock = product.in_stock && product.stock_quantity <= 10;

  const handleAdd = async () => {
    // Confirm on the button straight away; the request settles behind it.
    setAdded(true);
    await addItem(
      {
        product_id: product.id,
        quantity,
        recipient_name: recipientName.trim() || undefined,
        gift_message: giftMessage.trim() || undefined,
        engraving_text: product.allows_engraving
          ? engravingText.trim() || undefined
          : undefined,
      },
      product,
    );
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <div className="space-y-6">
      {/* Delivery signals */}
      <div className="flex flex-wrap gap-2">
        {product.same_day_delivery && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-noir-50 px-3 py-1.5 text-xs font-medium text-noir-700">
            <Zap className="h-3.5 w-3.5 text-gold-500" />
            Same-day delivery available
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-noir-50 px-3 py-1.5 text-xs font-medium text-noir-700">
          <Truck className="h-3.5 w-3.5 text-gold-500" />
          Free shipping over ₹1,999
        </span>
        {product.is_customisable && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-gold-50 px-3 py-1.5 text-xs font-medium text-gold-700">
            <Gift className="h-3.5 w-3.5" />
            Can be personalised
          </span>
        )}
      </div>

      {lowStock && (
        <p className="text-sm font-medium text-blush-500">
          Only {product.stock_quantity} left — these are made in small batches.
        </p>
      )}

      {/* Personalisation */}
      {(product.allows_message_card || product.allows_engraving) && (
        <div className="rounded-card border border-line bg-white">
          <button
            type="button"
            onClick={() => setShowPersonalisation((value) => !value)}
            aria-expanded={showPersonalisation}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="flex items-center gap-2.5">
              <Gift className="h-4 w-4 text-gold-600" />
              <span className="text-sm font-medium text-ink">
                Add a message{product.allows_engraving && ' or engraving'}
              </span>
            </span>
            <span className="text-xs text-muted">
              {showPersonalisation ? 'Hide' : 'Free'}
            </span>
          </button>

          {showPersonalisation && (
            <div className="space-y-4 border-t border-line px-5 py-5">
              <Field label="Recipient's name">
                <input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  maxLength={120}
                  placeholder="Ananya"
                  className="h-11 w-full rounded-md border border-line px-3.5 text-sm focus:border-noir-300"
                />
              </Field>

              {product.allows_message_card && (
                <Field
                  label="Gift message"
                  hint={`${giftMessage.length}/${MESSAGE_LIMIT}`}
                >
                  <textarea
                    value={giftMessage}
                    onChange={(event) => setGiftMessage(event.target.value)}
                    maxLength={MESSAGE_LIMIT}
                    rows={3}
                    placeholder="Hand-written on cotton card and sealed with wax."
                    className="w-full resize-none rounded-md border border-line px-3.5 py-2.5 text-sm focus:border-noir-300"
                  />
                </Field>
              )}

              {product.allows_engraving && (
                <Field
                  label="Engraving"
                  hint={`${engravingText.length}/${ENGRAVING_LIMIT}`}
                >
                  <input
                    value={engravingText}
                    onChange={(event) => setEngravingText(event.target.value)}
                    maxLength={ENGRAVING_LIMIT}
                    placeholder="A.R.K or a short line"
                    className="h-11 w-full rounded-md border border-line px-3.5 text-sm uppercase tracking-[0.1em] focus:border-noir-300"
                  />
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quantity + add */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-14 shrink-0 items-center rounded-pill border border-line bg-white">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-14 w-12 place-items-center text-noir-800 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            aria-label="Increase quantity"
            className="grid h-14 w-12 place-items-center text-noir-800 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <Button
          size="lg"
          fullWidth
          disabled={!product.in_stock || isLoading}
          onClick={handleAdd}
          className={cn('h-14', added && 'bg-noir-600')}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              Added to bag
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {product.in_stock ? 'Add to bag' : 'Sold out'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
        {label}
        {hint && <span className="tabular-nums">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
