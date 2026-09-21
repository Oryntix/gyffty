import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Press',
  description: 'Press enquiries and brand assets.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Press</h1>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Enquiries</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">For interviews, samples or comment, write to <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> with your deadline in the subject line.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Using our name</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">The brand is written Gyffty, capital G, no other styling. The seal should be reproduced whole, on a dark background, never recoloured or cropped.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted"><a className="text-gold-600 underline" href="/brand/gyffty-logo.png" download>Download the seal (PNG, 1024px)</a></p>
    </>
  );
}
