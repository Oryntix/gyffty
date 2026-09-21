'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, status, error, clearError } = useAuthStore();
  const refreshCart = useCartStore((state) => state.refresh);
  const mergeWishlist = useWishlistStore((state) => state.mergeGuestIntoAccount);

  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
  });

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const success =
      mode === 'login'
        ? await login(form.email, form.password)
        : await register({
            full_name: form.full_name,
            email: form.email,
            password: form.password,
            phone: form.phone || undefined,
          });

    if (success) {
      // The server merged any guest cart into the account; pull the new state,
      // and push up anything hearted before signing in.
      await refreshCart();
      await mergeWishlist();
      router.push('/account');
    }
  };

  const switchMode = (next: Mode) => {
    clearError();
    setMode(next);
  };

  return (
    <div className="container flex justify-center py-20">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Join Gyffty'}</p>
          <h1 className="mt-3 font-display text-display-md text-noir-900">
            {mode === 'login' ? 'Sign in' : 'Create an account'}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {mode === 'login'
              ? 'Your bag, addresses and order history, kept together.'
              : 'Save addresses, track orders and reorder in two taps.'}
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-4 rounded-card border border-line bg-white p-8">
          {mode === 'register' && (
            <Field
              label="Full name"
              required
              value={form.full_name}
              onChange={set('full_name')}
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
          />
          {mode === 'register' && (
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
            />
          )}
          <Field
            label="Password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? 'At least 8 characters' : undefined}
          />

          {error && (
            <p className="rounded-md bg-blush-100 px-3 py-2 text-xs text-blush-500">{error}</p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={status === 'loading'}>
            {status === 'loading'
              ? 'One moment…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </Button>

          <p className="pt-2 text-center text-sm text-muted">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-gold-600 underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-gold-600 underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Demo account: priya@example.com / Gyffty@2026 ·{' '}
          <Link href="/c/all" className="underline">
            or keep browsing
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">
        {label}
        {props.required && <span className="text-blush-500"> *</span>}
      </span>
      <input
        {...props}
        className="h-11 w-full rounded-md border border-line px-3.5 text-sm focus:border-noir-300"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}
