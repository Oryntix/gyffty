/**
 * The guest cart token.
 *
 * Lives in its own module because both the cart store and the auth store need
 * it, and importing one store from the other would create a cycle.
 *
 * The token identifies a server-side cart for a shopper who has not signed in.
 * It is rotated at every identity change — login, registration and logout — so
 * a token can never be replayed to reach someone else's cart, and so signing
 * out on a shared device leaves nothing behind.
 */

const CART_TOKEN_KEY = 'gyffty.cart-token';

export function readCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    // Private mode or blocked storage: behave as a brand-new guest.
    return null;
  }
}

export function writeCartToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_TOKEN_KEY, token);
  } catch {
    // Non-fatal: the cart simply will not survive a reload.
  }
}

export function clearCartToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CART_TOKEN_KEY);
  } catch {
    // Nothing to do.
  }
}
