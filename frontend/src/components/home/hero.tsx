'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SLIDES = [
  {
    eyebrow: 'The Customised Collection',
    title: 'Built around one person',
    body: 'Choose the box, choose what goes in it, add their name in gold foil. Assembled and shipped within three days.',
    cta: { label: 'Build a hamper', href: '/c/customised' },
    secondary: { label: 'See how it works', href: '/c/build-your-own-hamper' },
    image: 'https://picsum.photos/seed/hero-customised-1/1920/900',
  },
  {
    eyebrow: 'Festival Gifting',
    title: 'Every celebration, boxed',
    body: 'Diwali brass and mithai, Rakhi thalis, Christmas spice crates. Curated by our studio, delivered across India.',
    cta: { label: 'Shop festival', href: '/c/festival' },
    secondary: { label: 'Corporate boxes', href: '/c/custom-corporate' },
    image: 'https://picsum.photos/seed/hero-festival-1/1920/900',
  },
  {
    eyebrow: 'Gyffty LUXE',
    title: 'Our finest curation',
    body: 'Crystal, couverture and preserved blooms. The hampers we make when the occasion has to be remembered.',
    cta: { label: 'Explore LUXE', href: '/c/all?luxe=true' },
    secondary: { label: 'Anniversary picks', href: '/c/anniversary' },
    image: 'https://picsum.photos/seed/hero-anniversary-1/1920/900',
  },
];

const ROTATE_MS = 6500;

export function Hero() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-[560px] overflow-hidden bg-noir-900 sm:h-[640px] lg:h-[720px]">
      {SLIDES.map((slide, index) => (
        <div
          key={slide.title}
          aria-hidden={index !== active}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000 ease-silk',
            index === active ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className={cn(
              'object-cover transition-transform duration-[8000ms] ease-out',
              index === active ? 'scale-105' : 'scale-100',
            )}
          />
          {/* Left-weighted scrim keeps the copy legible over any photograph. */}
          <div className="absolute inset-0 bg-gradient-to-r from-noir-950/88 via-noir-950/55 to-noir-950/10" />

          <div className="container relative flex h-full items-center">
            <div className="max-w-xl text-bone">
              <p className="eyebrow text-gold-400">{slide.eyebrow}</p>
              <h1 className="mt-5 font-display text-display-xl">{slide.title}</h1>
              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-bone/75">
                {slide.body}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href={slide.cta.href} variant="gold" size="lg">
                  {slide.cta.label}
                </ButtonLink>
                <ButtonLink
                  href={slide.secondary.href}
                  size="lg"
                  className="border border-bone/35 bg-transparent text-bone hover:border-bone hover:bg-bone/10"
                >
                  {slide.secondary.label}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="absolute bottom-8 left-0 right-0">
        <div className="container flex items-center gap-2.5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show slide ${index + 1}: ${slide.title}`}
              aria-current={index === active}
              className={cn(
                'h-0.5 rounded-pill transition-all duration-500 ease-silk',
                index === active ? 'w-14 bg-gold-400' : 'w-7 bg-bone/35 hover:bg-bone/60',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
