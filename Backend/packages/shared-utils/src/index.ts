import { Redis } from 'ioredis';
import { ulid } from 'ulid';

export function generateId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}

export function formatETB(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

export function parseETB(value: string): number {
  return parseFloat(value);
}

const AMHARIC_MONTHS = ['መስከረም', 'ጥቅምት', 'ህዳር', 'ታህሳስ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዚያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];

export function getAmharicMonth(monthNumber: number): string {
  return AMHARIC_MONTHS[monthNumber - 1] ?? '';
}

export function toEthiopianDate(date: Date): { day: number; month: number; year: number; monthName: string; amharicDate: string } {
  const gregYear = date.getFullYear();
  const ethYear = gregYear - 8;
  const month = date.getMonth();
  const day = date.getDate();
  const amMonth = ((month + 4) % 12) + 1;
  const amDay = ((day + 10) % 30) + 1;

  return {
    day: amDay,
    month: amMonth,
    year: ethYear,
    monthName: AMHARIC_MONTHS[amMonth - 1] ?? '',
    amharicDate: `${amDay} ${AMHARIC_MONTHS[amMonth - 1] ?? ''} ${ethYear}`,
  };
}

export function formatDateResponse(date: Date): { gregorian_date: string; ethiopian_date: string } {
  const eth = toEthiopianDate(date);
  return {
    gregorian_date: date.toISOString().split('T')[0] ?? '',
    ethiopian_date: eth.amharicDate,
  };
}

export function getEthiopianFiscalYear(date: Date): number {
  const gregYear = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  if (month > 6 || (month === 6 && day >= 8)) {
    return gregYear - 7;
  }
  return gregYear - 8;
}

export function normalizePhone(phone: string): string {
  const stripped = phone.replace(/^0/, '');
  if (stripped.startsWith('+251')) return stripped;
  if (stripped.startsWith('251')) return `+${stripped}`;
  return `+251${stripped}`;
}

// Re-export all cache utilities from cache.ts
export { cached, invalidateCache, invalidateCachePattern, getCacheWithTtl, setCache, hasCache, getRedisClient } from './cache.js';
