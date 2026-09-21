import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Gyffty collects, why, and how long it is kept.',
};

export default function Page() {
  return (
    <>
      <p className="eyebrow">Gyffty</p>
      <h1 className="mt-3 font-display text-display-lg text-noir-900">Privacy policy</h1>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
        Last updated 19 September 2026
      </p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">What we collect</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted">
          <li>Your name, email and phone, so we can confirm and deliver the order.</li>
          <li>The recipient&apos;s name and address, so we can deliver to them.</li>
          <li>Any gift message or engraving text you enter, which is printed and then kept with the order record.</li>
          <li>Order history, if you have an account.</li>
      </ul>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We do not store card numbers. Payments are handled by the gateway, and we keep only its reference.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Why</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">To fulfil the order, to answer questions about it, and to meet our tax and accounting obligations. We do not sell personal data, and we share it only with the courier and the payment processor who need it to do their part.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">How long</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Order records are kept for eight years, which is what Indian tax law requires. Account data is kept until you ask us to delete it. Abandoned carts are cleared after 30 days.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Cookies and storage</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">We use browser storage for your cart and your signed-in session. There is no advertising and no cross-site tracking on this site.</p>
      <h2 className="mt-10 font-display text-2xl text-noir-900">Your rights</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">Write to <a className="text-gold-600 underline" href="mailto:care@gyffty.com">care@gyffty.com</a> to see, correct or delete what we hold. We respond within 30 days. Order records we are legally required to retain are the one exception.</p>
    </>
  );
}
