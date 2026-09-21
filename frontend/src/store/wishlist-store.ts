'use client';

import { create } from 'zustand';

import { authFetch } from '@/lib/auth-fetch';
import { useAuthStore } from '@/store/auth-store';
import type { ProductCard } from '@/types';

/**
 * The wishlist.
 *
 * Signed-in shoppers get a server-side list. Guests get a local one, which is
 * pushed up on their next sign-in rather than discarded — losing a saved item
 * because you happened not to be logged in is exactly the kind of small
 * betrayal that stops people using a feature.
 */

const GUEST_KEY = 'gyffty.wishlist';

function readGuestIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writeGuestIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
  } catch {
    // Non-fatal; the list just will not survive a reload.
  }
}

interface WishlistState {
  ids: Set<number>;
  items: ProductCard[];
  isLoading: boolean;
  hydrate: () => Promise<void>;
  toggle: (productId: number) => Promise<void>;
  has: (productId: number) => boolean;
  loadItems: () => Promise<void>;
  mergeGuestIntoAccount: () => Promise<void>;
  clearLocal: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set<number>(),
  items: [],
  isLoading: false,

  has: (productId) => get().ids.has(productId),

  async hydrate() {
    const signedIn = !!useAuthStore.getState().tokens?.access_token;
    if (!signedIn) {
      set({ ids: new Set(readGuestIds()) });
      return;
    }
    try {
      const ids = await authFetch<number[]>('/wishlist/ids');
      set({ ids: new Set(ids) });
    } catch {
      set({ ids: new Set(readGuestIds()) });
    }
  },

  async toggle(productId) {
    const signedIn = !!useAuthStore.getState().tokens?.access_token;

    // Flip immediately; the heart should never lag behind the tap.
    const next = new Set(get().ids);
    const wasSaved = next.has(productId);
    if (wasSaved) next.delete(productId);
    else next.add(productId);
    set({ ids: next });

    if (!signedIn) {
      writeGuestIds([...next]);
      return;
    }

    try {
      const result = await authFetch<{ product_id: number; wishlisted: boolean }>(
        `/wishlist/${productId}`,
        { method: 'POST' },
      );
      // Trust the server's answer over our guess.
      const settled = new Set(get().ids);
      if (result.wishlisted) settled.add(productId);
      else settled.delete(productId);
      set({ ids: settled });
    } catch {
      // Roll the optimistic flip back.
      const reverted = new Set(get().ids);
      if (wasSaved) reverted.add(productId);
      else reverted.delete(productId);
      set({ ids: reverted });
    }
  },

  async loadItems() {
    if (!useAuthStore.getState().tokens?.access_token) {
      set({ items: [] });
      return;
    }
    set({ isLoading: true });
    try {
      const rows = await authFetch<{ product: ProductCard }[]>('/wishlist');
      set({ items: rows.map((r) => r.product), isLoading: false });
    } catch {
      set({ items: [], isLoading: false });
    }
  },

  /** Called right after login, mirroring how the cart is merged.
   *
   *  The endpoint is a toggle, so anything already saved on the account must be
   *  skipped — posting it would silently *remove* it.
   */
  async mergeGuestIntoAccount() {
    const guestIds = readGuestIds();
    if (guestIds.length === 0) {
      await get().hydrate();
      return;
    }

    let alreadySaved = new Set<number>();
    try {
      alreadySaved = new Set(await authFetch<number[]>('/wishlist/ids'));
    } catch {
      // Could not read the account list; keep the guest list rather than
      // risk toggling items off.
      return;
    }

    const toAdd = guestIds.filter((id) => !alreadySaved.has(id));
    await Promise.allSettled(
      toAdd.map((id) => authFetch(`/wishlist/${id}`, { method: 'POST' })),
    );
    writeGuestIds([]);
    await get().hydrate();
  },

  clearLocal() {
    writeGuestIds([]);
    set({ ids: new Set<number>(), items: [] });
  },
}));
