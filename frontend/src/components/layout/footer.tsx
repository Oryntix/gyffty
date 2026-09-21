import Link from 'next/link';
import { Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

import { GyfftySeal } from '@/components/layout/logo';
import { NewsletterForm } from '@/components/layout/newsletter-form';

import { FOOTER_COLUMNS, siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="mt-24 bg-noir-900 text-bone/85">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="container grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-gold-400">Join the studio list</p>
            <h2 className="mt-3 font-display text-display-md text-bone">
              First look at new hampers
            </h2>
            <p className="mt-3 max-w-md text-sm text-bone/65">
              One email a month: seasonal drops, restocks and a code for your first order.
              No noise.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <GyfftySeal size={150} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-bone/60">
            {siteConfig.description}
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-bone/70">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              {siteConfig.address}
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-gold-400" />
              {siteConfig.phone}
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-gold-400" />
              {siteConfig.email}
            </li>
          </ul>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
              {column.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-bone/65 transition-colors hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <p className="text-xs text-bone/50">
            © {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] uppercase tracking-[0.18em] text-bone/40">
              Visa · Mastercard · RuPay · UPI
            </span>
            <div className="flex gap-2">
              {[Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  aria-label={index === 0 ? 'Instagram' : 'LinkedIn'}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 transition-colors hover:border-gold-400 hover:text-gold-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
