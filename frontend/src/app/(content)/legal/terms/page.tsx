import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The terms on which Gyffty sells.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Terms of service</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Placing an order</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">An order is an offer to buy. It is accepted when we confirm it, and a contract exists from that point. We may decline an order if an item is unavailable, the address is outside our range, or the price shown was wrong.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Prices</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Prices are in Indian rupees and include GST at 18%. Shipping is shown separately before you pay. If a price is listed in error we will contact you before charging, and you may cancel.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Substitutions</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Hamper contents are occasionally substituted for items of equal or greater value where something is out of stock, and fresh flowers vary by season. We will not substitute an item you specifically chose in a Bespoke box without asking you first.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Personalised items</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Engraving and printed messages are reproduced exactly as supplied, including any spelling you enter. Personalised items cannot be remade free of charge for a typing error.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Liability</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Our liability for any order is limited to the amount paid for it. Nothing here limits liability for death, personal injury or fraud.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Governing law</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">These terms are governed by the laws of India, and the courts of Bangalore have exclusive jurisdiction.</p>
    </>
  );
}
