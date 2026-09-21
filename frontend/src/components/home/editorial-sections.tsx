import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Package, ShieldCheck, Truck } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/primitives';
import { PROMISES } from '@/config/site';

const PROMISE_ICONS = {
  package: Package,
  truck: Truck,
  badge: BadgeCheck,
  shield: ShieldCheck,
} as const;

/** The four-up trust strip that sits directly under the hero. */
export function PromiseStrip() {
  return (
    <section className="border-y border-line bg-white">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map((promise) => {
          const Icon = PROMISE_ICONS[promise.icon];
          return (
            <div key={promise.title} className="flex gap-4">
              <Icon className="h-6 w-6 shrink-0 text-gold-600" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-semibold text-noir-900">{promise.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{promise.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Split banner promoting the build-your-own flow. */
export function CustomiseBanner() {
  const steps = [
    { n: '01', title: 'Choose a box', body: 'Six sizes, from a petite kraft box to the signature ivory chest.' },
    { n: '02', title: 'Fill it', body: 'Pick from 80 pantry, spa and keepsake items. We suggest pairings as you go.' },
    { n: '03', title: 'Make it theirs', body: 'Gold-foil monogram, a handwritten note and the ribbon colour you choose.' },
  ];

  return (
    <section className="bg-noir-900 py-20 text-bone">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[5/4] overflow-hidden rounded-card">
          <Image
            src="https://picsum.photos/seed/tile-customised-1/1000/800"
            alt="A hamper being assembled in the Gyffty studio"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-gold-400/25" />
        </div>

        <div>
          <p className="eyebrow text-gold-400">Customised</p>
          <h2 className="mt-4 font-display text-display-lg">
            Build a hamper that could only be for them
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-bone/70">
            Our most-ordered product is not a product at all. It is a box you fill yourself,
            assembled by hand in Bengaluru and finished with their name.
          </p>

          <ol className="mt-10 space-y-6">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-5">
                <span className="font-display text-3xl text-gold-500">{step.n}</span>
                <div>
                  <h3 className="text-base font-medium text-bone">{step.title}</h3>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-bone/60">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <ButtonLink href="/c/customised" variant="gold" size="lg" className="mt-10">
            Start building
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Occasion shortcuts, mirroring the "Our Finest Curation" grid on FNP LUXE. */
export function OccasionGrid() {
  const occasions = [
    { label: 'Diwali', href: '/c/diwali', seed: 'tile-diwali-1' },
    { label: 'Raksha Bandhan', href: '/c/raksha-bandhan', seed: 'tile-raksha-bandhan-1' },
    { label: 'For Her', href: '/c/for-her', seed: 'tile-for-her-1' },
    { label: 'For Him', href: '/c/for-him', seed: 'tile-for-him-1' },
    { label: 'Midnight Birthday', href: '/c/midnight-surprise', seed: 'tile-midnight-surprise-1' },
    { label: 'Milestone Years', href: '/c/milestone-years', seed: 'tile-milestone-years-1' },
    { label: 'Corporate', href: '/c/custom-corporate', seed: 'tile-custom-corporate-1' },
    { label: 'For Kids', href: '/c/for-kids', seed: 'tile-for-kids-1' },
  ];

  return (
    <section className="py-16 sm:py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Our finest curation"
          title="Shop by occasion"
          href="/c/all"
          hrefLabel="Browse everything"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {occasions.map((occasion) => (
            <Link key={occasion.href} href={occasion.href} className="group text-center">
              <div className="relative aspect-square overflow-hidden rounded-full bg-noir-50">
                <Image
                  src={`https://picsum.photos/seed/${occasion.seed}/500/500`}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, 22vw"
                  className="object-cover transition-transform duration-700 ease-silk group-hover:scale-110"
                />
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-noir-900/10 transition-all duration-500 group-hover:ring-4 group-hover:ring-gold-400/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-noir-900 transition-colors group-hover:text-gold-600">
                {occasion.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Wide LUXE promotion band. */
export function LuxeBanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[420px]">
        <Image
          src="https://picsum.photos/seed/hero-birthday-1/1920/800"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-noir-950/92 via-noir-950/70 to-noir-950/30" />
        <div className="container relative flex min-h-[420px] items-center py-16">
          <div className="max-w-lg text-bone">
            <p className="eyebrow text-gold-400">Gyffty LUXE</p>
            <h2 className="mt-4 font-display text-display-lg">Bespoke excellence</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-bone/70">
              Crystal, couverture, preserved blooms and hand-engraved keepsakes. Our LUXE
              hampers are made in small runs, and most sell out inside a fortnight.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/c/all?luxe=true" variant="gold" size="lg">
                Explore LUXE
              </ButtonLink>
              <ButtonLink
                href="/c/anniversary?luxe=true"
                size="lg"
                className="border border-bone/35 bg-transparent text-bone hover:border-bone hover:bg-bone/10"
              >
                Anniversary LUXE
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Social proof, kept to three quotes so it reads quickly. */
export function Testimonials() {
  const quotes = [
    {
      body: 'I sent the Rose Atelier hamper to my sister in Pune and it arrived a day early, packed better than anything I have ordered online.',
      name: 'Ananya R.',
      meta: 'Bengaluru',
    },
    {
      body: 'We ordered 120 Diwali boxes for our team. One contact, one invoice, and every box had our logo done properly.',
      name: 'Rohit S.',
      meta: 'Head of People, fintech',
    },
    {
      body: 'The engraving on the walnut chest was flawless. My father does not say much, but he has kept it on his desk since.',
      name: 'Meera K.',
      meta: 'Mumbai',
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="container">
        <SectionHeading
          eyebrow="Treasured connections"
          title="What people tell us"
          align="center"
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {quotes.map((quote) => (
            <figure
              key={quote.name}
              className="flex h-full flex-col rounded-card border border-line bg-bone p-8"
            >
              <span aria-hidden className="font-display text-5xl leading-none text-gold-300">
                &ldquo;
              </span>
              <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/85">
                {quote.body}
              </blockquote>
              <figcaption className="mt-6 border-t border-line pt-4">
                <p className="text-sm font-medium text-noir-900">{quote.name}</p>
                <p className="text-xs text-muted">{quote.meta}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
