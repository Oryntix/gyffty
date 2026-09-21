'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Package } from 'lucide-react';

import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { authFetch } from '@/lib/auth-fetch';
import { formatDate, formatPrice, humanise } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { Order, Page } from '@/types';

export default function AccountPage() {
  const router = useRouter();
  const { user, tokens, logout } = useAuthStore();

  const [orders, setOrders] = useState<Page<Order> | null>(null);

  useEffect(() => {
    if (!tokens?.access_token) {
      router.replace('/login');
      return;
    }
    authFetch<Page<Order>>('/orders')
      .then(setOrders)
      .catch(() => setOrders({ items: [], total: 0, page: 1, page_size: 24, pages: 0 }));
  }, [tokens, router]);

  if (!user) {
    return (
      <div className="container py-20">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  return (
    <div className="container py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-3 font-display text-display-md text-noir-900">
            Hello, {user.full_name.split(' ')[0]}
          </h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            logout();
            router.push('/');
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-noir-900">
          <Package className="mr-2 inline h-5 w-5 text-gold-600" />
          Your orders
        </h2>

        {orders === null ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-28 w-full rounded-card" />
          </div>
        ) : orders.items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No orders yet"
              description="When you place an order it will appear here, with live tracking."
              action={<ButtonLink href="/c/all">Browse hampers</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/order/${order.order_number}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-6 transition-colors hover:border-noir-300"
                >
                  <div>
                    <p className="font-medium text-ink">{order.order_number}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(order.created_at)} · {order.items.length}{' '}
                      {order.items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="rounded-pill bg-noir-50 px-3 py-1.5 text-xs font-medium text-noir-700">
                      {humanise(order.status)}
                    </span>
                    <span className="font-semibold">{formatPrice(order.grand_total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
