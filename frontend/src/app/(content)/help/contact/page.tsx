import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'How to reach the Gyffty studio.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Contact us</h1>
      <h2 className="mt-10 font-display text-2xl text-noir-900">The studio</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Email <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> or call <a className="text-gold-600 underline" href="tel:+919876543210">+91 98765 43210</a>, Monday to Saturday, 10am to 7pm IST.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We answer email within one working day. If your hamper is due today, call instead.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Corporate and bulk</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">For orders above 25 boxes, branded packaging, or an invoice against a PO, write to the same address with the quantity and date and we will come back with pricing. See <Link className="text-gold-600 underline" href="/c/custom-corporate">corporate gifting</Link>.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Where we are</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Bangalore &amp; Beyond, Karnataka, India. The studio is not a shop, so please write before visiting.</p>
    </>
  );
}
