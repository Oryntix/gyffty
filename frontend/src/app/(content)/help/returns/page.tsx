import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns and remakes',
  description: 'What happens when a hamper arrives damaged or wrong.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Returns and remakes</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Damaged or wrong</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Send one photograph to <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> within 48 hours of delivery and we remake the hamper and send it again. You do not need to return anything, and there is no charge.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">This is the policy we actually operate. We would rather remake a box than argue about it.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Changed your mind</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">An order can be cancelled from your account while it is still Confirmed or Packed. Once it ships it is on its way and cannot be recalled.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Because hampers are assembled to order and many contain food, we cannot accept returns of undamaged goods.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Refunds</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Cancelled orders are refunded to the original payment method. Banks usually take five to seven working days to show it.</p>
    </>
  );
}
