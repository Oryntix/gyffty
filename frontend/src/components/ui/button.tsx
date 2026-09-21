import { forwardRef } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-noir-800 text-bone hover:bg-noir-700 active:bg-noir-900 shadow-sm',
  gold: 'bg-gold-500 text-noir-950 hover:bg-gold-400 active:bg-gold-600 shadow-sm',
  outline:
    'border border-noir-800/25 text-noir-800 bg-transparent hover:border-noir-800 hover:bg-noir-50',
  ghost: 'text-noir-800 hover:bg-noir-50',
  dark: 'bg-ink text-bone hover:bg-ink/90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-[15px]',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-wide transition-all duration-300 ease-silk disabled:pointer-events-none disabled:opacity-50';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  fullWidth?: boolean;
}

export const buttonClasses = ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: CommonProps) => cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & CommonProps
>(function Button({ variant, size, fullWidth, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    />
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & CommonProps) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
