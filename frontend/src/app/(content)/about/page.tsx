import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our studio',
  description: 'How Gyffty hampers are made, and who makes them.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Our studio</h1>
      <h2 className="mt-10 font-display text-2xl text-noir-900">What we do</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Gyffty assembles gift hampers by hand in Bangalore. Every box is packed to order, never pulled off a shelf, and never drop-shipped by a third party.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">That is the whole proposition. It is slower than the alternative, and it is the reason a Gyffty box looks the way it does when it is opened.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Bespoke, hampers, candles</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Three lines. Bespoke is a box you fill yourself, finished with a name in gold foil. Hampers are our own curations, built around a relationship, a festival or a milestone. Candles are hand-poured in small batches.</p>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Everything is made in the same studio by the same people.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Bangalore and beyond</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We deliver across India, with same-day service in eight metros for orders placed before 4pm. Elsewhere, allow two to four working days.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">If something is wrong</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Send one photograph to <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> and we remake the hamper. There is no form to fill in and nothing to return.</p>
    </>
  );
}
