import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping policy',
  description: 'Where Gyffty ships, when, and at what cost.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Shipping policy</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Where</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Across India. Some fresh items are restricted to cities we reach same-day or next-day. We do not ship internationally.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Cost</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Free above &#8377;1,999, flat &#8377;99 below. The figure is shown in the cart and does not change at the last step.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">When</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted">
          <li>Same-day in eight metros, ordered before 4pm, on hampers marked Same Day.</li>
          <li>Two to four working days everywhere else.</li>
          <li>Festival weeks run longer; order early for Diwali and Raksha Bandhan.</li>
      </ul>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Failed delivery</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Couriers attempt delivery twice. If nobody is available the hamper returns to the studio and we contact you to rearrange. A second dispatch to the same address is charged at cost.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Delivery to a third party</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Most of our orders go to someone other than the buyer. Please make sure the recipient will be there, and add a phone number the courier can call.</p>
    </>
  );
}
