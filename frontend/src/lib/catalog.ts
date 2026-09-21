import { apiFetch, apiFetchSafe, buildQuery } from '@/lib/api';
import type {
  CategoryTree,
  HomeRails,
  Page,
  ProductCard,
  ProductDetail,
  ProductFacets,
  ProductQuery,
  RatingSummary,
  Review,
} from '@/types';

/** Catalogue reads are cached; they change at merchandising pace, not per request. */
const CATALOG_TTL = 120;

const EMPTY_PAGE: Page<ProductCard> = {
  items: [],
  total: 0,
  page: 1,
  page_size: 24,
  pages: 0,
};

export const getCategories = () =>
  apiFetchSafe<CategoryTree[]>('/categories', [], { revalidate: CATALOG_TTL });

export const getCategory = (slug: string) =>
  apiFetch<CategoryTree>(`/categories/${slug}`, { revalidate: CATALOG_TTL });

export const getProducts = (query: ProductQuery = {}) =>
  apiFetchSafe<Page<ProductCard>>(`/products${buildQuery(query)}`, EMPTY_PAGE, {
    revalidate: CATALOG_TTL,
  });

export const getProduct = (slug: string) =>
  apiFetch<ProductDetail>(`/products/${slug}`, { revalidate: CATALOG_TTL });

export const getRelatedProducts = (slug: string, limit = 8) =>
  apiFetchSafe<ProductCard[]>(`/products/${slug}/related?limit=${limit}`, [], {
    revalidate: CATALOG_TTL,
  });

export const getFacets = (category?: string) =>
  apiFetchSafe<ProductFacets>(
    `/products/facets${buildQuery({ category })}`,
    { price_buckets: [], occasions: [], recipients: [], themes: [] },
    { revalidate: CATALOG_TTL },
  );

export const getHomeRails = () =>
  apiFetchSafe<HomeRails>(
    '/products/rails',
    { bestsellers: [], new_arrivals: [], luxe: [], customisable: [] },
    { revalidate: CATALOG_TTL },
  );

export const getReviews = (slug: string, page = 1) =>
  apiFetchSafe<Page<Review>>(
    `/products/${slug}/reviews?page=${page}&page_size=6`,
    { items: [], total: 0, page: 1, page_size: 6, pages: 0 },
    { revalidate: CATALOG_TTL },
  );

export const getRatingSummary = (slug: string) =>
  apiFetchSafe<RatingSummary>(
    `/products/${slug}/reviews/summary`,
    { average: 0, count: 0, distribution: {} },
    { revalidate: CATALOG_TTL },
  );
