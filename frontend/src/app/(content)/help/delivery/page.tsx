import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery and timings',
  description: 'Delivery windows, same-day cut-offs and shipping charges.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Delivery and timings</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Charges</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Shipping is free on orders above &#8377;1,999, and a flat &#8377;99 below that. The cart shows how much more you need to add for free shipping, so there is nothing new to discover at the last step.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Same-day delivery</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Available in Delhi NCR, Mumbai, Bangalore, Hyderabad, Chennai, Pune, Kolkata and Ahmedabad, on hampers marked Same Day. Order before 4pm.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Midnight delivery, between 11pm and 12am, is offered on selected birthday hampers.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Everywhere else</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Two to four working days. Fresh items such as flowers and cakes are only offered where we can deliver same-day or next-day.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Slots</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted">
          <li>9am - 1pm</li>
          <li>1pm - 5pm</li>
          <li>5pm - 9pm</li>
          <li>11pm - 12am, on midnight hampers</li>
      </ul>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Tracking</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Every order has a number beginning GYF. Track it at <Link className="text-gold-600 underline" href="/track">/track</Link>, or from your account if you were signed in when you ordered.</p>
    </>
  );
}
