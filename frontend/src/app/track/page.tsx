'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function TrackPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');

  return (
    <div className="container flex justify-center py-24">
      <div className="w-full max-w-lg text-center">
        <p className="eyebrow">Order tracking</p>
        <h1 className="mt-3 font-display text-display-md text-noir-900">
          Where is my hamper?
        </h1>
        <p className="mt-3 text-sm text-muted">
          Enter the order number from your confirmation email. It looks like
          GYF-260915-6013DC.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (orderNumber.trim()) {
              router.push(`/order/${orderNumber.trim().toUpperCase()}`);
            }
          }}
          className="mt-8 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              placeholder="GYF-000000-XXXXXX"
              aria-label="Order number"
              className="h-12 w-full rounded-pill border border-line bg-white pl-11 pr-4 text-sm tracking-[0.06em] focus:border-noir-300"
            />
          </div>
          <Button type="submit" size="lg">
            Track
          </Button>
        </form>
      </div>
    </div>
  );
}
