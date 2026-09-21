'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Briefcase,
  Flame,
  Gem,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  User as UserIcon,
  X,
} from 'lucide-react';

import { GyfftyLogo } from '@/components/layout/logo';
import { MegaMenu } from '@/components/layout/mega-menu';
import { MobileNav } from '@/components/layout/mobile-nav';
import { PILLARS, QUICK_LINKS, siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

const QUICK_ICONS = {
  truck: Truck,
  flame: Flame,
  gem: Gem,
  sparkles: Sparkles,
  briefcase: Briefcase,
  tag: Tag,
  package: Package,
} as const;

const ANNOUNCEMENTS = [
  'The art of bespoke giving',
  'Free shipping on orders above ₹1,999',
  'Same-day delivery in 8 metros — order before 4pm',
  'Use GYFFTY10 for 10% off your first hamper',
];

export function Header() {
  const router = useRouter();
  const [openPillar, setOpenPillar] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const itemCount = useCartStore((state) => state.cart?.item_count ?? 0);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const refreshCart = useCartStore((state) => state.refresh);
  const user = useAuthStore((state) => state.user);

  const hydrateWishlist = useWishlistStore((state) => state.hydrate);

  useEffect(() => {
    void refreshCart();
    void hydrateWishlist();
  }, [refreshCart, hydrateWishlist]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Announcement marquee */}
      <div className="overflow-hidden bg-noir-950 py-2 text-bone/80">
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap px-6 text-[11px] uppercase tracking-[0.18em]">
          {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((line, index) => (
            <span key={index} className="flex items-center gap-3">
              <span className="text-gold-400">◆</span>
              {line}
            </span>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'border-b border-white/10 bg-noir-900/97 backdrop-blur transition-shadow duration-300',
          scrolled && 'shadow-lift',
        )}
        onMouseLeave={() => setOpenPillar(null)}
      >
        <div className="container">
          <div className="flex h-[70px] items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full text-bone/80 hover:bg-white/10 hover:text-gold-300 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" aria-label={`${siteConfig.name} home`}>
              <GyfftyLogo priority />
            </Link>

            {/* Desktop search */}
            <form
              onSubmit={submitSearch}
              className="relative hidden max-w-md flex-1 lg:block"
              role="search"
            >
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/40" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search hampers, occasions, recipients…"
                aria-label="Search hampers"
                className="h-11 w-full rounded-pill border border-white/15 bg-white/5 pl-11 pr-4 text-sm text-bone placeholder:text-bone/40 focus:border-gold-400"
              />
            </form>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen((value) => !value)}
                aria-label="Search"
                className="grid h-10 w-10 place-items-center rounded-full text-bone/80 hover:bg-white/10 hover:text-gold-300 lg:hidden"
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>

              <Link
                href={user ? '/account' : '/login'}
                className="hidden items-center gap-2 rounded-pill px-3 py-2 text-sm text-bone/80 transition-colors hover:bg-white/10 hover:text-gold-300 sm:flex"
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden xl:inline">
                  {user ? user.full_name.split(' ')[0] : 'Sign in'}
                </span>
              </Link>

              <button
                type="button"
                onClick={openDrawer}
                aria-label={`Open bag, ${itemCount} items`}
                className="relative grid h-10 w-10 place-items-center rounded-full text-bone/80 transition-colors hover:bg-white/10 hover:text-gold-300"
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-noir-950">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search drawer */}
          {searchOpen && (
            <form onSubmit={submitSearch} className="pb-3 lg:hidden" role="search">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bone/40" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search hampers…"
                  aria-label="Search hampers"
                  className="h-11 w-full rounded-pill border border-white/15 bg-white/5 pl-11 pr-4 text-sm text-bone placeholder:text-bone/40 focus:border-gold-400"
                />
              </div>
            </form>
          )}

          {/* Pillar navigation */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1 pb-1">
              {PILLARS.map((pillar) => (
                <li key={pillar.slug}>
                  <Link
                    href={`/c/${pillar.slug}`}
                    onMouseEnter={() => setOpenPillar(pillar.slug)}
                    onFocus={() => setOpenPillar(pillar.slug)}
                    className={cn(
                      'relative block px-4 py-3 text-[13px] font-medium uppercase tracking-[0.14em] text-bone/85 transition-colors hover:text-gold-300',
                      openPillar === pillar.slug && 'text-gold-300',
                    )}
                  >
                    {pillar.name}
                    <span
                      className={cn(
                        'absolute inset-x-4 bottom-1.5 h-px origin-left scale-x-0 bg-gold-500 transition-transform duration-300 ease-silk',
                        openPillar === pillar.slug && 'scale-x-100',
                      )}
                    />
                  </Link>
                </li>
              ))}
              <li className="ml-2">
                <Link
                  href="/c/all?luxe=true"
                  className="block px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.2em] text-gold-400"
                >
                  Luxe
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <MegaMenu
          pillar={PILLARS.find((p) => p.slug === openPillar) ?? null}
          onClose={() => setOpenPillar(null)}
        />
      </div>

      {/* Quick-link icon strip */}
      <div className="border-b border-white/10 bg-noir-800/95 backdrop-blur">
        <div className="container">
          <ul className="no-scrollbar flex items-center gap-2 overflow-x-auto py-2.5">
            {QUICK_LINKS.map((link) => {
              const Icon = QUICK_ICONS[link.icon];
              return (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="flex shrink-0 items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-bone/85 transition-colors hover:border-gold-400/60 hover:bg-white/10 hover:text-gold-300"
                  >
                    <Icon className="h-3.5 w-3.5 text-gold-400" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
