/** Mirrors the Pydantic schemas served by the FastAPI backend. */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  hero_image: string | null;
  tile_image: string | null;
  accent_color: string | null;
  icon: string | null;
  display_order: number;
  is_featured: boolean;
  parent_id: number | null;
  is_active: boolean;
}

export interface CategoryTree extends Category {
  children: Category[];
  product_count: number;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductInclusion {
  id: number;
  name: string;
  quantity: string | null;
  note: string | null;
}

export interface ProductCard {
  id: number;
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  rating_average: number;
  rating_count: number;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  is_luxe: boolean;
  is_customisable: boolean;
  same_day_delivery: boolean;
  stock_quantity: number;
  images: ProductImage[];
  discount_percent: number;
  in_stock: boolean;
  primary_image: string | null;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  category: Category | null;
  occasion_tags: string | null;
  recipient_tags: string | null;
  theme_tags: string | null;
  allows_message_card: boolean;
  allows_engraving: boolean;
  inclusions: ProductInclusion[];
  seo_title: string | null;
  seo_description: string | null;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface PriceBucket {
  label: string;
  min_price: number;
  max_price: number | null;
  count: number;
}

export interface ProductFacets {
  price_buckets: PriceBucket[];
  occasions: FacetValue[];
  recipients: FacetValue[];
  themes: FacetValue[];
}

export type HomeRails = Record<
  'bestsellers' | 'new_arrivals' | 'luxe' | 'customisable',
  ProductCard[]
>;

export interface CartTotals {
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  tax_total: number;
  grand_total: number;
  free_shipping_threshold: number;
  amount_to_free_shipping: number;
  currency: string;
}

export interface CartItem {
  id: number;
  product: ProductCard;
  quantity: number;
  unit_price: number;
  line_total: number;
  gift_message: string | null;
  engraving_text: string | null;
  recipient_name: string | null;
}

export interface Cart {
  id: number;
  items: CartItem[];
  item_count: number;
  totals: CartTotals;
  coupon_code: string | null;
  /** Why a submitted code was not applied. */
  coupon_message: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'staff' | 'admin';
  is_active: boolean;
  is_verified: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  product_slug: string;
  product_sku: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  gift_message: string | null;
  engraving_text: string | null;
  recipient_name: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  contact_email: string;
  contact_phone: string;
  ship_to_name: string;
  ship_line1: string;
  ship_line2: string | null;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  ship_country: string;
  delivery_date: string | null;
  delivery_slot: string | null;
  subtotal: number;
  discount_total: number;
  shipping_fee: number;
  tax_total: number;
  grand_total: number;
  currency: string;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface PaymentIntent {
  provider: string;
  intent_id: string;
  amount_minor: number;
  currency: string;
  public_key: string | null;
}

/** POST /orders/checkout returns the order *and* how to pay for it. */
export interface CheckoutResponse {
  order: Order;
  payment: PaymentIntent | null;
}

export interface CouponSummary {
  code: string;
  label: string;
  description: string | null;
  min_order_value: number;
}

export interface Review {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  author_name: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<string, number>;
}

export interface ProductQuery {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  occasion?: string;
  recipient?: string;
  theme?: string;
  customisable?: boolean;
  same_day?: boolean;
  luxe?: boolean;
  bestseller?: boolean;
  new_arrival?: boolean;
  min_rating?: number;
  in_stock_only?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details: Record<string, unknown> };
}
