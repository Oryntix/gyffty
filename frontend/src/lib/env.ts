/**
 * Environment validation.
 *
 * A missing API URL should fail the build or the boot, not surface as an
 * empty storefront at 2am. This runs at module load, so `next build` and
 * `next start` both surface the problem immediately.
 */

const PLACEHOLDER_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value.trim();
}

function validUrl(name: string, value: string): string {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL (got "${value}").`);
  }
  return value.replace(/\/+$/, '');
}

const isProd = process.env.NODE_ENV === 'production';

const serverApiBase = validUrl(
  'API_BASE_URL',
  required('API_BASE_URL', process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL),
);

const browserApiBase = validUrl(
  'NEXT_PUBLIC_API_BASE_URL',
  required('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL),
);

const siteUrl = validUrl(
  'NEXT_PUBLIC_SITE_URL',
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
);

// A production deploy pointing the browser at localhost is a misconfiguration
// that would only show up as failing fetches in customers' browsers.
if (isProd && typeof window === 'undefined') {
  const host = new URL(browserApiBase).hostname;
  if (PLACEHOLDER_HOSTS.includes(host)) {
    console.warn(
      `[env] NEXT_PUBLIC_API_BASE_URL points at "${host}". ` +
        'Browsers will not be able to reach the API in production.',
    );
  }
  if (!browserApiBase.startsWith('https://')) {
    console.warn('[env] NEXT_PUBLIC_API_BASE_URL is not HTTPS.');
  }
}

export const env = {
  serverApiBase,
  browserApiBase,
  siteUrl,
  isProd,
} as const;
