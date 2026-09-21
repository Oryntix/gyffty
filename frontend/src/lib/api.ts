import { env } from '@/lib/env';
import type { ApiErrorBody } from '@/types';

/**
 * One fetch wrapper for both runtimes.
 *
 * Server components use API_BASE_URL (container-internal), the browser uses
 * NEXT_PUBLIC_API_BASE_URL. Keeping both in one place means a page can move
 * between server and client without its data calls changing.
 */
export const apiBase = () =>
  typeof window === 'undefined' ? env.serverApiBase : env.browserApiBase;

/** Abort a hung upstream rather than holding a render open indefinitely. */
const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
  cartToken?: string | null;
  /** Seconds to cache on the server. Omit for a dynamic, uncached request. */
  revalidate?: number;
  /** Cache tags, so a webhook can invalidate exactly what changed. */
  tags?: string[];
  timeoutMs?: number;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, cartToken, revalidate, tags, timeoutMs, headers, ...rest } =
    options;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (cartToken) requestHeaders['X-Cart-Token'] = cartToken;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: rest.signal ?? controller.signal,
      ...(revalidate === undefined
        ? { cache: 'no-store' as const }
        : { next: { revalidate, ...(tags ? { tags } : {}) } }),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(504, 'timeout', 'The request took too long. Please try again.');
    }
    throw new ApiError(
      503,
      'network_error',
      'We could not reach the server. Please check your connection.',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let code = 'http_error';
    let message = `Request failed with status ${response.status}`;
    let details: Record<string, unknown> = {};
    try {
      const payload = (await response.json()) as Partial<ApiErrorBody>;
      if (payload.error) {
        code = payload.error.code;
        message = payload.error.message;
        details = payload.error.details ?? {};
      }
    } catch {
      // Non-JSON error body; the status-derived message is the best we have.
    }
    throw new ApiError(response.status, code, message, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** apiFetch, but a failed request yields a fallback instead of throwing.
 *  Used for non-critical rails so one dead endpoint cannot blank a page. */
export async function apiFetchSafe<T>(
  path: string,
  fallback: T,
  options: RequestOptions = {},
): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[api] ${path} failed:`, (error as Error).message);
    }
    return fallback;
  }
}

export function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
