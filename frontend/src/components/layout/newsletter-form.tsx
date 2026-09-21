'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

import { apiFetch } from '@/lib/api';

type Status = 'idle' | 'submitting' | 'done' | 'error';

/**
 * The footer signup.
 *
 * It was previously a form with no handler, so submitting it reloaded the page
 * and threw the address away.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    try {
      const result = await apiFetch<{ message: string }>('/newsletter/subscribe', {
        method: 'POST',
        body: { email: email.trim(), source: 'footer' },
      });
      setStatus('done');
      setMessage(result.message);
      setEmail('');
    } catch (error) {
      setStatus('error');
      setMessage(
        (error as Error).message || 'That did not go through. Please try again.',
      );
    }
  };

  if (status === 'done') {
    return (
      <div className="flex w-full max-w-md items-center gap-3 rounded-pill border border-gold-400/40 bg-white/5 px-6 py-4 lg:ml-auto">
        <Check className="h-5 w-5 shrink-0 text-gold-400" />
        <p className="text-sm text-bone/85">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md lg:ml-auto">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
          className="h-12 flex-1 rounded-pill border border-white/15 bg-white/5 px-5 text-sm text-bone placeholder:text-bone/40 focus:border-gold-400"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="h-12 shrink-0 rounded-pill bg-gold-500 px-6 text-sm font-semibold text-noir-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
        >
          {status === 'submitting' ? 'One moment' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p id="newsletter-error" className="mt-2 text-xs text-blush-300">
          {message}
        </p>
      )}
    </form>
  );
}
