import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(value: number, currency = 'INR'): string {
  if (currency !== 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return inr.format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "for-her,for-him" -> ["For Her", "For Him"] */
export function parseTags(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function humanise(tag: string): string {
  return tag
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** The soonest date a hamper can be delivered, used as the date-picker floor. */
export function earliestDeliveryDate(sameDay: boolean): string {
  const date = new Date();
  date.setDate(date.getDate() + (sameDay ? 0 : 2));
  return date.toISOString().slice(0, 10);
}

export function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;
}
