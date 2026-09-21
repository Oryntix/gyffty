'use client';

import { create } from 'zustand';

import { apiBase, apiFetch } from '@/lib/api';
import { clearCartToken, readCartToken, writeCartToken } from '@/lib/cart-token';
import { getAccessToken } from '@/store/auth-store';
import type { Cart, CartItem, ProductCard } from '@/types';

/**
 * Cart mutations need the response *headers*, not only the body: on a guest's
 * first request the server mints a token in `X-Cart-Token` that every later
 * request must echo back. So these calls bypass `apiFetch`.
 */
type CartRequestInit = Omit<RequestInit, 'body'> & { body?: unknown };

async function cartRequest(path: string, init: CartRequestInit = {}) {
  const token = getAccessToken();
  const cartToken = readCartToken();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cartToken) headers['X-Cart-Token'] = cartToken;

  const response = await fetch(`${apiBase()}/cart${path}`, {
    ...init,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });

  const minted = response.headers.get('X-Cart-Token');
  if (minted) writeCartToken(minted);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'We could not update your cart.');
  }
  return (await response.json()) as Cart;
}

/** Recompute the shape of a cart locally. Deliberately approximate: the server
 *  owns discounts, shipping and tax, and its answer replaces this within a
 *  few hundred milliseconds. */
function reprice(cart: Cart, items: CartItem[]): Cart {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.line_total, 0) * 100) / 100;
  const taxable = Math.max(subtotal - cart.totals.discount_total, 0);
  const shipping =
    taxable >= cart.totals.free_shipping_threshold || taxable === 0
      ? 0
      : cart.totals.shipping_fee || 99;
  return {
    ...cart,
    items,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    totals: {
      ...cart.totals,
      subtotal,
      shipping_fee: shipping,
      grand_total: Math.round((taxable + shipping + taxable * 0.18) * 100) / 100,
      amount_to_free_shipping: Math.max(cart.totals.free_shipping_threshold - taxable, 0),
    },
  };
}

function applyLocalQuantity(cart: Cart, itemId: number, quantity: number): Cart {
  return reprice(
    cart,
    cart.items.map((i) =>
      i.id === itemId
        ? { ...i, quantity, line_total: Math.round(i.unit_price * quantity * 100) / 100 }
        : i,
    ),
  );
}

function withoutLine(cart: Cart, itemId: number): Cart {
  return reprice(cart, cart.items.filter((i) => i.id !== itemId));
}

function withOptimisticLine(cart: Cart, product: ProductCard, quantity: number): Cart {
  const existing = cart.items.find((i) => i.product.id === product.id);
  if (existing) {
    return applyLocalQuantity(cart, existing.id, existing.quantity + quantity);
  }
  const line: CartItem = {
    // Negative id marks a line the server has not confirmed yet; it is
    // replaced wholesale by the response.
    id: -Date.now(),
    product,
    quantity,
    unit_price: product.price,
    line_total: Math.round(product.price * quantity * 100) / 100,
    gift_message: null,
    engraving_text: null,
    recipient_name: null,
  };
  return reprice(cart, [...cart.items, line]);
}

interface CartState {
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  couponCode: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addItem: (
    payload: {
      product_id: number;
      quantity?: number;
      gift_message?: string;
      engraving_text?: string;
      recipient_name?: string;
    },
    /** Pass the product so the drawer can draw the line before the server replies. */
    product?: ProductCard,
  ) => Promise<void>;
  updateItem: (itemId: number, patch: Partial<Pick<CartItem, 'quantity'>>) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string | null) => Promise<void>;
  dismissError: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isOpen: false,
  isLoading: false,
  error: null,
  couponCode: null,

  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  dismissError: () => set({ error: null }),

  async refresh() {
    // A guest with no token has no cart yet; skip the round trip.
    if (!readCartToken() && !getAccessToken()) return;
    set({ isLoading: true });
    try {
      const query = get().couponCode ? `?coupon=${encodeURIComponent(get().couponCode!)}` : '';
      const cart = await cartRequest(query);
      set({ cart, isLoading: false, error: null });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  async addItem(payload, product) {
    // Open the drawer and show the line before the request completes. If the
    // caller passed the product it is drawn properly; otherwise the drawer
    // shows its loading state until the server answers.
    const previous = get().cart;
    if (product && previous) {
      set({ cart: withOptimisticLine(previous, product, payload.quantity ?? 1) });
    }
    set({ isOpen: true, isLoading: true, error: null });

    try {
      const cart = await cartRequest('/items', {
        method: 'POST',
        body: { quantity: 1, ...payload },
      });
      set({ cart, isLoading: false });
    } catch (error) {
      set({ cart: previous, isLoading: false, error: (error as Error).message });
    }
  },

  async updateItem(itemId, patch) {
    // Move the number immediately. A quantity stepper that waits ~300ms for a
    // remote database feels broken, and the server is the one that decides
    // the real value anyway — we just reconcile when it answers.
    const previous = get().cart;
    if (previous && patch.quantity !== undefined) {
      set({ cart: applyLocalQuantity(previous, itemId, patch.quantity) });
    }
    set({ error: null });
    try {
      const cart = await cartRequest(`/items/${itemId}`, { method: 'PATCH', body: patch });
      set({ cart, isLoading: false });
    } catch (error) {
      // Put it back the way it was.
      set({ cart: previous, isLoading: false, error: (error as Error).message });
    }
  },

  async removeItem(itemId) {
    const previous = get().cart;
    if (previous) set({ cart: withoutLine(previous, itemId) });
    set({ error: null });
    try {
      const cart = await cartRequest(`/items/${itemId}`, { method: 'DELETE' });
      set({ cart, isLoading: false });
    } catch (error) {
      set({ cart: previous, isLoading: false, error: (error as Error).message });
    }
  },

  async clear() {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartRequest('', { method: 'DELETE' });
      set({ cart, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: (error as Error).message });
    }
  },

  async applyCoupon(code) {
    set({ couponCode: code });
    await get().refresh();
  },
}));

/** Placing an order empties the server cart, so drop the local mirror too. */
export async function resetCartAfterCheckout() {
  useCartStore.setState({ cart: null, couponCode: null, isOpen: false });
}

/**
 * Wipe every trace of the previous session's cart.
 *
 * Without this, signing out on a shared device leaves the last customer's
 * items visible in the drawer until the next refresh.
 */
export function clearCartOnSignOut() {
  clearCartToken();
  useCartStore.setState({
    cart: null,
    couponCode: null,
    isOpen: false,
    error: null,
  });
}

export { apiFetch };
