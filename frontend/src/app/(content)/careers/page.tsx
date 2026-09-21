import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Working at Gyffty.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Careers</h1>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Working here</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We are a small studio. Most roles involve packing hampers at some point, including the ones whose titles do not say so.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We hire for care and for consistency. The work is detailed and repetitive in the way that craft usually is.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Open roles</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Nothing formally listed at the moment. If you want to work here, write to <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> and tell us what you would want to do. We read everything that arrives.</p>
    </>
  );
}
