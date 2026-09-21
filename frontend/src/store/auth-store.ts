'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiFetch } from '@/lib/api';
import { configureAuthFetch } from '@/lib/auth-fetch';
import { clearCartToken, readCartToken } from '@/lib/cart-token';
import { clearCartOnSignOut } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import type { AuthResponse, TokenPair, User } from '@/types';

interface AuthState {
  user: User | null;
  tokens: TokenPair | null;
  status: 'idle' | 'loading';
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      status: 'idle',
      error: null,

      async login(email, password) {
        set({ status: 'loading', error: null });
        try {
          // Send the guest cart token so the server merges that cart into the
          // account, then discard it: the server has deleted that cart, and
          // keeping the token around invites replay.
          const cartToken = readCartToken();
          const data = await apiFetch<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
            cartToken,
          });
          clearCartToken();
          set({ user: data.user, tokens: data.tokens, status: 'idle' });
          return true;
        } catch (error) {
          set({ status: 'idle', error: (error as Error).message });
          return false;
        }
      },

      async register(payload) {
        set({ status: 'loading', error: null });
        try {
          const data = await apiFetch<AuthResponse>('/auth/register', {
            method: 'POST',
            body: payload,
            cartToken: readCartToken(),
          });
          clearCartToken();
          set({ user: data.user, tokens: data.tokens, status: 'idle' });
          return true;
        } catch (error) {
          set({ status: 'idle', error: (error as Error).message });
          return false;
        }
      },

      logout() {
        // Tell the server to revoke the refresh token, but do not wait on it:
        // signing out of this device must be instant either way.
        const refresh = useAuthStore.getState().tokens?.refresh_token;
        const access = useAuthStore.getState().tokens?.access_token;
        if (refresh && access) {
          void apiFetch('/auth/logout', {
            method: 'POST',
            body: { refresh_token: refresh },
            token: access,
          }).catch(() => undefined);
        }
        clearCartOnSignOut();
        useWishlistStore.getState().clearLocal();
        set({ user: null, tokens: null, error: null });
      },

      clearError() {
        set({ error: null });
      },
    }),
    { name: 'gyffty.auth' },
  ),
);

export const getAccessToken = () => useAuthStore.getState().tokens?.access_token ?? null;

// Give authFetch a way to read and replace tokens without importing the store
// at module scope, which would create a cycle.
configureAuthFetch(
  () => useAuthStore.getState().tokens,
  (tokens) => {
    if (tokens) {
      useAuthStore.setState({ tokens });
    } else {
      // Refresh failed: the session is over. Clear it the same way logout does.
      useAuthStore.getState().logout();
    }
  },
);
