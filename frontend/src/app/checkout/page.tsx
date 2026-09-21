'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Lock, Tag } from 'lucide-react';

import { Button, ButtonLink } from '@/components/ui/button';
import { DELIVERY_SLOTS } from '@/config/site';
import { apiFetch } from '@/lib/api';
import { earliestDeliveryDate, formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { resetCartAfterCheckout, useCartStore } from '@/store/cart-store';
import type { CheckoutResponse, CouponSummary, Order } from '@/types';

const CART_TOKEN_KEY = 'gyffty.cart-token';

interface FormState {
  contact_email: string;
  contact_phone: string;
  full_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  delivery_date: string;
  delivery_slot: string;
  delivery_instructions: string;
}

const EMPTY_FORM: FormState = {
  contact_email: '',
  contact_phone: '',
  full_name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  delivery_date: '',
  delivery_slot: DELIVERY_SLOTS[0],
  delivery_instructions: '',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refresh, couponCode, applyCoupon } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [couponInput, setCouponInput] = useState('');
  const [coupons, setCoupons] = useState<CouponSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Offer whatever is actually live, rather than codes hardcoded in the markup.
  useEffect(() => {
    apiFetch<CouponSummary[]>('/orders/coupons')
      .then(setCoupons)
      .catch(() => setCoupons([]));
  }, []);

  // Prefill from the signed-in account; guests type it themselves.
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      contact_email: current.contact_email || user.email,
      contact_phone: current.contact_phone || user.phone || '',
      full_name: current.full_name || user.full_name,
    }));
  }, [user]);

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const totals = cart?.totals;
  const items = cart?.items ?? [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const cartToken =
        typeof window === 'undefined' ? null : localStorage.getItem(CART_TOKEN_KEY);

      const { order, payment } = await apiFetch<CheckoutResponse>('/orders/checkout', {
        method: 'POST',
        token: tokens?.access_token ?? null,
        cartToken,
        body: {
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          coupon_code: couponCode,
          delivery_date: form.delivery_date || null,
          delivery_slot: form.delivery_slot,
          delivery_instructions: form.delivery_instructions || null,
          shipping_address: {
            full_name: form.full_name,
            phone: form.contact_phone,
            line1: form.line1,
            line2: form.line2 || null,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            country: 'India',
          },
        },
      });

      // The order exists now, so nothing below may prevent the shopper from
      // reaching its confirmation page.
      await resetCartAfterCheckout();

      if (payment) {
        try {
          await apiFetch<Order>('/orders/payment/confirm', {
            method: 'POST',
            token: tokens?.access_token ?? null,
            body: {
              order_number: order.order_number,
              // The mock gateway verifies its own intent id. A real gateway
              // returns a signature here instead, from its checkout widget.
              payload: { intent_id: payment.intent_id },
            },
          });
        } catch {
          // The webhook is the authoritative signal, so a failed client-side
          // confirmation is recoverable. Show the order either way.
        }
      }

      router.push(`/order/${order.order_number}`);
    } catch (submitError) {
      setError((submitError as Error).message);
      setSubmitting(false);
    }
  };

  if (cart && items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <h1 className="font-display text-display-md text-noir-900">Your bag is empty</h1>
        <p className="mt-3 text-sm text-muted">
          Add a hamper before checking out.
        </p>
        <ButtonLink href="/c/all" className="mt-8">
          Browse hampers
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="font-display text-display-md text-noir-900">Checkout</h1>
      {!user && (
        <p className="mt-2 text-sm text-muted">
          Checking out as a guest.{' '}
          <Link href="/login" className="text-gold-600 underline">
            Sign in
          </Link>{' '}
          to save your addresses and track this order.
        </p>
      )}

      <form onSubmit={submit} className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
        <div className="space-y-10">
          <Section title="Contact" step="01">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                required
                value={form.contact_email}
                onChange={set('contact_email')}
                placeholder="you@example.com"
              />
              <Input
                label="Phone"
                type="tel"
                required
                minLength={10}
                value={form.contact_phone}
                onChange={set('contact_phone')}
                placeholder="98765 43210"
              />
            </div>
          </Section>

          <Section title="Where is it going?" step="02">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Recipient's full name"
                required
                value={form.full_name}
                onChange={set('full_name')}
                className="sm:col-span-2"
              />
              <Input
                label="Address line 1"
                required
                value={form.line1}
                onChange={set('line1')}
                className="sm:col-span-2"
                placeholder="Flat, house number, building"
              />
              <Input
                label="Address line 2"
                value={form.line2}
                onChange={set('line2')}
                className="sm:col-span-2"
                placeholder="Street, area, landmark"
              />
              <Input label="City" required value={form.city} onChange={set('city')} />
              <Input label="State" required value={form.state} onChange={set('state')} />
              <Input
                label="PIN code"
                required
                pattern="[0-9]{6}"
                maxLength={6}
                value={form.pincode}
                onChange={set('pincode')}
              />
            </div>
          </Section>

          <Section title="When should it arrive?" step="03">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Delivery date"
                type="date"
                min={earliestDeliveryDate(false)}
                value={form.delivery_date}
                onChange={set('delivery_date')}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Delivery slot
                </span>
                <select
                  value={form.delivery_slot}
                  onChange={set('delivery_slot')}
                  className="h-11 w-full rounded-md border border-line bg-white px-3.5 text-sm focus:border-noir-300"
                >
                  {DELIVERY_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Delivery instructions
                </span>
                <textarea
                  rows={3}
                  value={form.delivery_instructions}
                  onChange={set('delivery_instructions')}
                  placeholder="Leave with the neighbour, call before arriving, do not ring the bell…"
                  className="w-full resize-none rounded-md border border-line px-3.5 py-2.5 text-sm focus:border-noir-300"
                />
              </label>
            </div>
          </Section>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-[200px] lg:self-start">
          <div className="rounded-card border border-line bg-white p-6">
            <h2 className="font-display text-xl text-noir-900">Order summary</h2>

            <ul className="mt-5 max-h-64 space-y-4 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-noir-50">
                    {item.product.primary_image && (
                      <Image
                        src={item.product.primary_image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-noir-800 text-[10px] text-bone">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-ink">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">{formatPrice(item.line_total)}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <input
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="h-10 w-full rounded-pill border border-line pl-9 pr-3 text-xs uppercase tracking-[0.1em] focus:border-noir-300"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyCoupon(couponInput || null)}
                >
                  Apply
                </Button>
              </div>
              {couponCode && totals && totals.discount_total > 0 && (
                <p className="mt-2 text-xs text-noir-700">
                  {couponCode} applied — you saved {formatPrice(totals.discount_total)}
                </p>
              )}
              {cart?.coupon_message && (
                <p className="mt-2 text-xs text-blush-500">{cart.coupon_message}</p>
              )}
              {coupons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {coupons.map((c) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponInput(c.code);
                          void applyCoupon(c.code);
                        }}
                        className="text-[11px] text-muted transition-colors hover:text-gold-600"
                      >
                        <span className="font-medium text-gold-700">{c.code}</span>
                        {' — '}
                        {c.description ?? c.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {totals && (
              <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
                <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
                {totals.discount_total > 0 && (
                  <Row
                    label="Discount"
                    value={`-${formatPrice(totals.discount_total)}`}
                    tone="positive"
                  />
                )}
                <Row
                  label="Shipping"
                  value={totals.shipping_fee === 0 ? 'Free' : formatPrice(totals.shipping_fee)}
                />
                <Row label="GST (18%)" value={formatPrice(totals.tax_total)} />
                <div className="flex justify-between border-t border-line pt-3">
                  <dt className="font-display text-lg text-noir-900">Total</dt>
                  <dd className="text-lg font-semibold">{formatPrice(totals.grand_total)}</dd>
                </div>
              </dl>
            )}

            {error && (
              <p className="mt-4 rounded-md bg-blush-100 px-3 py-2 text-xs text-blush-500">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" fullWidth disabled={submitting} className="mt-6">
              <Lock className="h-4 w-4" />
              {submitting ? 'Placing order…' : 'Place order'}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted">
              Payment is captured on delivery in this demo build.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className="font-display text-2xl text-gold-500">{step}</span>
        <h2 className="font-display text-2xl text-noir-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Input({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {props.required && <span className="text-blush-500"> *</span>}
      </span>
      <input
        {...props}
        className="h-11 w-full rounded-md border border-line bg-white px-3.5 text-sm focus:border-noir-300"
      />
    </label>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive';
}) {
  return (
    <div className={`flex justify-between ${tone === 'positive' ? 'text-noir-700' : ''}`}>
      <dt className={tone ? '' : 'text-muted'}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
