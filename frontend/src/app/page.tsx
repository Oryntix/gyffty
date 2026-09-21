import {
  CustomiseBanner,
  LuxeBanner,
  OccasionGrid,
  PromiseStrip,
  Testimonials,
} from '@/components/home/editorial-sections';
import { Hero } from '@/components/home/hero';
import { PillarTiles } from '@/components/home/pillar-tiles';
import { ProductRail } from '@/components/product/product-rail';
import { getCategories, getHomeRails } from '@/lib/catalog';

export const revalidate = 300;

export default async function HomePage() {
  // One round trip each; both are cached at the data layer.
  const [categories, rails] = await Promise.all([getCategories(), getHomeRails()]);

  return (
    <>
      <Hero />
      <PromiseStrip />
      <PillarTiles categories={categories} />

      <ProductRail
        eyebrow="Signature pieces"
        title="Our bestsellers"
        description="The hampers that leave the studio most often, in every category."
        href="/c/all?bestseller=true"
        products={rails.bestsellers}
      />

      <CustomiseBanner />

      <ProductRail
        eyebrow="Make it personal"
        title="Customise and personalise"
        description="Engraving, monograms, photographs and hampers you fill yourself."
        href="/c/customised"
        products={rails.customisable}
      />

      <OccasionGrid />
      <LuxeBanner />

      <ProductRail
        eyebrow="Just landed"
        title="New this season"
        href="/c/all?new_arrival=true"
        products={rails.new_arrivals}
      />

      <Testimonials />

      <ProductRail
        eyebrow="Luxury in trend"
        title="The LUXE collection"
        description="Small runs, finer materials, and packaging that is part of the gift."
        href="/c/all?luxe=true"
        products={rails.luxe}
      />
    </>
  );
}
