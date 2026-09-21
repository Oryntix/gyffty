import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-display-lg text-noir-900">
        This page has been gifted away
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted">
        The link may be old, or the hamper may have sold out and been retired. The
        catalogue is still here.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/c/all" variant="outline">
          Browse all hampers
        </ButtonLink>
      </div>
    </div>
  );
}
