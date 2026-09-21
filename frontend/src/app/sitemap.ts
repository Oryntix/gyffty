import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { getCategories, getProducts } from '@/lib/catalog';

// Rendered on demand, never at build time: a build must not depend on a live
// API, and a slow catalogue must not be able to fail a deploy. Put a CDN cache
// in front of it if crawler traffic ever matters.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/c/all', priority: 0.9, changeFrequency: 'daily' },
  { path: '/track', priority: 0.3, changeFrequency: 'monthly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: `${env.siteUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // A failed API call must degrade the sitemap, not break the whole route.
  const categories = await getCategories();
  for (const pillar of categories) {
    entries.push({
      url: `${env.siteUrl}/c/${pillar.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    for (const child of pillar.children) {
      entries.push({
        url: `${env.siteUrl}/c/${child.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // Walk every page of the catalogue rather than only the first.
  let page = 1;
  let pages = 1;
  do {
    const batch = await getProducts({ page, page_size: 100 });
    pages = batch.pages || 1;
    for (const product of batch.items) {
      entries.push({
        url: `${env.siteUrl}/p/${product.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: product.is_bestseller ? 0.8 : 0.6,
      });
    }
    // Stop early when the API is unreachable and returns an empty page.
    if (batch.items.length === 0) break;
    page += 1;
  } while (page <= pages && page <= 20); // hard stop, so a bad total cannot loop forever

  return entries;
}
