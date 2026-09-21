import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cancellation policy',
  description: 'When a Gyffty order can be cancelled, and how refunds work.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Cancellation policy</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Cancelling</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">You can cancel from your account while the order is Confirmed or Packed. Once it is Shipped it cannot be cancelled, because it has left the studio.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Same-day and midnight orders move quickly, so the window on those is short.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Refunds</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Cancelled orders are refunded in full to the original payment method. Banks typically take five to seven working days.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Bespoke and engraved</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">A Bespoke box can be cancelled up to the point engraving begins, usually the working day after you order. After that the personalised component is non-refundable, though the rest of the hamper still is.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Cancellations by us</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">If we cancel — stock, an unreachable address, a pricing error — you are refunded in full and told why.</p>
    </>
  );
}
