/**
 * Brand and navigation constants.
 *
 * The five pillars here must match the category slugs seeded in the backend.
 * Everything else on this page (taglines, promises, footer) is copy you can
 * change without touching a component.
 */

export const siteConfig = {
  name: 'Gyffty',
  legalName: 'Gyffty Gifting Studio Pvt. Ltd.',
  // The two arcs from the brand seal.
  tagline: 'The art of bespoke giving',
  motto: 'Curating the extraordinary',
  productLines: ['Bespoke', 'Hampers', 'Candles'],
  region: 'Bangalore & Beyond',
  description:
    'Bespoke hampers, curated gifts and hand-poured candles, assembled by hand in Bangalore and sent across India.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  phone: '+91 98765 43210',
  whatsapp: '+919876543210',
  email: 'care@gyffty.com',
  address: 'Bangalore & Beyond, Karnataka, India',
} as const;

export interface PillarNav {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  accent: string;
  /** Curated links rendered inside the mega-menu column. */
  collections: { label: string; href: string }[];
  /** A second column of shortcuts that cut across the collections. */
  shortcuts: { label: string; href: string }[];
}

export const PILLARS: PillarNav[] = [
  {
    slug: 'customised',
    name: 'Customised',
    tagline: 'Made for one person only',
    blurb: 'Build the box, choose the contents, add their name.',
    accent: '#B08D57',
    collections: [
      { label: 'Build Your Own Hamper', href: '/c/build-your-own-hamper' },
      { label: 'Engraved Keepsakes', href: '/c/engraved-keepsakes' },
      { label: 'Photo Personalised', href: '/c/photo-personalised' },
      { label: 'Corporate & Bulk', href: '/c/custom-corporate' },
    ],
    shortcuts: [
      { label: 'Engraving available', href: '/c/customised?theme=engraved' },
      { label: 'Under ₹2,000', href: '/c/customised?max_price=2000' },
      { label: 'Bulk orders (25+)', href: '/c/custom-corporate' },
    ],
  },
  {
    slug: 'relationship',
    name: 'Relationship',
    tagline: 'For the people who matter',
    blurb: 'Shop by who is opening the box, not what the calendar says.',
    accent: '#C2185B',
    collections: [
      { label: 'For Her', href: '/c/for-her' },
      { label: 'For Him', href: '/c/for-him' },
      { label: 'For Parents', href: '/c/for-parents' },
      { label: 'For Friends', href: '/c/for-friends' },
      { label: 'For Couples', href: '/c/for-couples' },
    ],
    shortcuts: [
      { label: 'Same-day delivery', href: '/c/relationship?same_day=true' },
      { label: 'Bestsellers', href: '/c/relationship?bestseller=true' },
      { label: 'LUXE picks', href: '/c/relationship?luxe=true' },
    ],
  },
  {
    slug: 'festival',
    name: 'Festival',
    tagline: 'Every celebration, boxed',
    blurb: 'Diwali to Christmas, assembled in our studio and shipped across India.',
    accent: '#E07A2F',
    collections: [
      { label: 'Diwali', href: '/c/diwali' },
      { label: 'Raksha Bandhan', href: '/c/raksha-bandhan' },
      { label: 'Christmas', href: '/c/christmas' },
      { label: 'Holi', href: '/c/holi' },
      { label: 'Eid', href: '/c/eid' },
    ],
    shortcuts: [
      { label: 'Corporate festival boxes', href: '/c/festival?recipient=corporate' },
      { label: 'Traditional sweets', href: '/c/festival?theme=sweets' },
      { label: 'Under ₹2,500', href: '/c/festival?max_price=2500' },
    ],
  },
  {
    slug: 'anniversary',
    name: 'Anniversary',
    tagline: 'One more year, marked properly',
    blurb: 'First anniversaries through silver and gold, plus weddings and work milestones.',
    accent: '#7B2D5B',
    collections: [
      { label: 'First Anniversary', href: '/c/first-anniversary' },
      { label: 'Milestone Years', href: '/c/milestone-years' },
      { label: 'Wedding Gifting', href: '/c/wedding-gifting' },
      { label: 'Work Anniversary', href: '/c/work-anniversary' },
    ],
    shortcuts: [
      { label: 'Engraved gifts', href: '/c/anniversary?customisable=true' },
      { label: 'LUXE collection', href: '/c/anniversary?luxe=true' },
      { label: 'Above ₹5,000', href: '/c/anniversary?min_price=5000' },
    ],
  },
  {
    slug: 'birthday',
    name: 'Birthday',
    tagline: 'Arrive before the cake does',
    blurb: 'Midnight surprises, milestone boxes and same-day metro delivery.',
    accent: '#1E7A6F',
    collections: [
      { label: 'Midnight Surprise', href: '/c/midnight-surprise' },
      { label: 'Milestone Birthdays', href: '/c/milestone-birthdays' },
      { label: 'For Kids', href: '/c/for-kids' },
      { label: 'Birthday LUXE', href: '/c/birthday-luxe' },
    ],
    shortcuts: [
      { label: 'Same-day delivery', href: '/c/birthday?same_day=true' },
      { label: 'Cakes & flowers', href: '/c/birthday?theme=cake' },
      { label: 'Under ₹2,000', href: '/c/birthday?max_price=2000' },
    ],
  },
];

/** The scrollable icon strip directly under the header, copied in spirit from FNP. */
export const QUICK_LINKS = [
  { label: 'Same Day', href: '/c/all?same_day=true', icon: 'truck' },
  { label: 'Bestsellers', href: '/c/all?bestseller=true', icon: 'flame' },
  { label: 'LUXE', href: '/c/all?luxe=true', icon: 'gem' },
  { label: 'Customise', href: '/c/customised', icon: 'sparkles' },
  { label: 'Corporate', href: '/c/custom-corporate', icon: 'briefcase' },
  { label: 'Under ₹2,000', href: '/c/all?max_price=2000', icon: 'tag' },
] as const;

export const PROMISES = [
  {
    title: 'Packed by hand',
    body: 'Every hamper is assembled in our Bengaluru studio, never drop-shipped.',
    icon: 'package',
  },
  {
    title: 'Same-day in 8 metros',
    body: 'Order before 4pm for delivery today in Delhi NCR, Mumbai, Bengaluru and more.',
    icon: 'truck',
  },
  {
    title: 'Free shipping over ₹1,999',
    body: 'Flat ₹99 below that. No surprises at the last step of checkout.',
    icon: 'badge',
  },
  {
    title: 'Replaced, no questions',
    body: 'If it arrives damaged, send one photograph and we remake it.',
    icon: 'shield',
  },
] as const;

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'bestselling', label: 'Bestselling' },
  { value: 'newest', label: 'New arrivals' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
] as const;

export const DELIVERY_SLOTS = [
  '9am - 1pm',
  '1pm - 5pm',
  '5pm - 9pm',
  '11pm - 12am (midnight)',
] as const;

export const FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: PILLARS.map((pillar) => ({ label: pillar.name, href: `/c/${pillar.slug}` })),
  },
  {
    title: 'Help',
    links: [
      { label: 'Track your order', href: '/track' },
      { label: 'Delivery & timings', href: '/help/delivery' },
      { label: 'Returns & remakes', href: '/help/returns' },
      { label: 'Contact us', href: '/help/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our studio', href: '/about' },
      { label: 'Corporate gifting', href: '/c/custom-corporate' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/legal/terms' },
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Shipping policy', href: '/legal/shipping' },
      { label: 'Cancellation policy', href: '/legal/cancellation' },
    ],
  },
] as const;
