'use client';

import { ApiError, apiFetch, type RequestOptions } from '@/lib/api';
import type { TokenPair } from '@/types';

/**
 * Authenticated fetch that transparently renews an expired access token.
 *
 * Access tokens last 60 minutes. Without this, a shopper who leaves a tab open
 * over lunch is silently signed out mid-checkout, even though their 30-day
 * refresh token is still perfectly valid.
 *
 * Concurrent 401s share a single refresh: five parallel calls must not fire
 * five refreshes and race each other into revoking the winner's token.
 */

type TokenReader = () => TokenPair | null;
type TokenWriter = (tokens: TokenPair | null) => void;

let readTokens: TokenReader = () => null;
let writeTokens: TokenWriter = () => undefined;
let inFlightRefresh: Promise<TokenPair | null> | null = null;

/** Wired up once by the auth store, which owns the tokens. */
export function configureAuthFetch(read: TokenReader, write: TokenWriter): void {
  readTokens = read;
  writeTokens = write;
}

async function refreshTokens(): Promise<TokenPair | null> {
  const current = readTokens();
  if (!current?.refresh_token) return null;

  inFlightRefresh ??= apiFetch<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: current.refresh_token },
  })
    .then((tokens) => {
      writeTokens(tokens);
      return tokens;
    })
    .catch(() => {
      // The refresh token is spent or revoked: this session is genuinely over.
      writeTokens(null);
      return null;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

export async function authFetch<T>(
  path: string,
  options: Omit<RequestOptions, 'token'> = {},
): Promise<T> {
  const tokens = readTokens();

  try {
    return await apiFetch<T>(path, { ...options, token: tokens?.access_token ?? null });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    const renewed = await refreshTokens();
    if (!renewed) throw error;

    return apiFetch<T>(path, { ...options, token: renewed.access_token });
  }
}
