'use client';

import { useEffect } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center py-32 text-center">
      <p className="eyebrow">Something broke</p>
      <h1 className="mt-4 font-display text-display-lg text-noir-900">
        We could not load that
      </h1>
      <p className="mt-4 max-w-md text-sm text-muted">
        Most often this means the API is not running. Start the backend, then try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
