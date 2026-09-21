'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, Package, Truck } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/primitives';
import { authFetch } from '@/lib/auth-fetch';
import { formatDate, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { Order } from '@/types';

const TIMELINE = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const;

const STEP_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export default function OrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const tokens = useAuthStore((state) => state.tokens);

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch<Order>(`/orders/${params.orderNumber}`)
      .then(setOrder)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, [params.orderNumber, tokens]);

  if (error) {
    return (
      <div className="container py-24 text-center">
        <h1 className="font-display text-display-md text-noir-900">Order not found</h1>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <ButtonLink href="/track" className="mt-8">
          Track another order
        </ButtonLink>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container space-y-4 py-20">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  const currentStep = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="container max-w-4xl py-14">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-noir-600" strokeWidth={1.25} />
        <h1 className="mt-5 font-display text-display-md text-noir-900">
          {cancelled ? 'Order cancelled' : 'Thank you, your order is confirmed'}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Order <span className="font-medium text-ink">{order.order_number}</span> · placed{' '}
          {formatDate(order.created_at)}
        </p>
        <p className="mt-1 text-sm text-muted">
          A confirmation has gone to {order.contact_email}.
        </p>
      </div>

      {!cancelled && (
        <ol className="mt-12 flex justify-between gap-2">
          {TIMELINE.map((step, index) => {
            const done = index <= currentStep;
            return (
              <li key={step} className="flex flex-1 flex-col items-center text-center">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 text-xs ${
                    done
                      ? 'border-noir-700 bg-noir-700 text-bone'
                      : 'border-line bg-white text-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`mt-2 text-[11px] ${done ? 'text-noir-800' : 'text-muted'}`}
                >
                  {STEP_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="rounded-card border border-line bg-white p-6">
          <h2 className="font-display text-xl text-noir-900">
            <Package className="mr-2 inline h-4 w-4 text-gold-600" />
            In this order
          </h2>
          <ul className="mt-5 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-noir-50">
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{item.product_name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Qty {item.quantity} · {formatPrice(item.unit_price)} each
                  </p>
                  {item.recipient_name && (
                    <p className="mt-1 text-xs text-muted">For {item.recipient_name}</p>
                  )}
                  {item.gift_message && (
                    <p className="mt-1 text-xs italic text-muted">“{item.gift_message}”</p>
                  )}
                  {item.engraving_text && (
                    <p className="mt-1 text-xs text-gold-600">
                      Engraved: {item.engraving_text}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold">{formatPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div className="rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg text-noir-900">
              <Truck className="mr-2 inline h-4 w-4 text-gold-600" />
              Delivering to
            </h2>
            <address className="mt-4 text-sm not-italic leading-relaxed text-muted">
              <span className="font-medium text-ink">{order.ship_to_name}</span>
              <br />
              {order.ship_line1}
              {order.ship_line2 && (
                <>
                  <br />
                  {order.ship_line2}
                </>
              )}
              <br />
              {order.ship_city}, {order.ship_state} {order.ship_pincode}
              <br />
              {order.ship_country}
            </address>
            {(order.delivery_date || order.delivery_slot) && (
              <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
                {order.delivery_date && formatDate(order.delivery_date)}
                {order.delivery_slot && ` · ${order.delivery_slot}`}
              </p>
            )}
          </div>

          <div className="rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-lg text-noir-900">Payment</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              {order.discount_total > 0 && (
                <Row
                  label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`}
                  value={`-${formatPrice(order.discount_total)}`}
                />
              )}
              <Row
                label="Shipping"
                value={order.shipping_fee === 0 ? 'Free' : formatPrice(order.shipping_fee)}
              />
              <Row label="GST" value={formatPrice(order.tax_total)} />
              <div className="flex justify-between border-t border-line pt-3">
                <dt className="font-medium text-noir-900">Total</dt>
                <dd className="font-semibold">{formatPrice(order.grand_total)}</dd>
              </div>
            </dl>
          </div>

          <ButtonLink href="/c/all" variant="outline" fullWidth>
            Continue shopping
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
