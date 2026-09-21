'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import { GyfftyMark } from '@/components/layout/logo';
import { PILLARS, siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

/** Slide-in accordion navigation for phones and small tablets. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(PILLARS[0]?.slug ?? null);
  const user = useAuthStore((state) => state.user);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-noir-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm animate-slide-in-right flex-col bg-bone shadow-lift">
        <div className="flex items-center justify-between border-b border-white/10 bg-noir-900 px-5 py-4">
          <span className="flex items-center gap-2.5">
            <GyfftyMark size={34} />
            <span className="font-display text-2xl tracking-[0.14em] text-gold-300">
              {siteConfig.name.toUpperCase()}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5 text-bone/80" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Mobile">
          {PILLARS.map((pillar) => {
            const isOpen = expanded === pillar.slug;
            return (
              <div key={pillar.slug} className="border-b border-line/70">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : pillar.slug)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-3 py-4 text-left"
                >
                  <span className="text-sm font-medium uppercase tracking-[0.12em] text-noir-900">
                    {pillar.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted transition-transform duration-300',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen && (
                  <ul className="pb-3">
                    <li>
                      <Link
                        href={`/c/${pillar.slug}`}
                        onClick={onClose}
                        className="block px-3 py-2.5 text-sm font-medium text-gold-700"
                      >
                        Shop all {pillar.name}
                      </Link>
                    </li>
                    {pillar.collections.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="block px-3 py-2.5 text-sm text-muted"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line p-5">
          <Link
            href={user ? '/account' : '/login'}
            onClick={onClose}
            className="block rounded-pill bg-noir-800 py-3 text-center text-sm font-medium text-bone"
          >
            {user ? `Hi, ${user.full_name.split(' ')[0]}` : 'Sign in or create account'}
          </Link>
          <Link
            href="/track"
            onClick={onClose}
            className="mt-3 block text-center text-xs uppercase tracking-[0.16em] text-muted"
          >
            Track your order
          </Link>
        </div>
      </div>
    </div>
  );
}
