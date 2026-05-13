import { v4 as uuidv4 } from 'uuid';
import agenciesData from './agenciesData.json';
import usersData from './usersData.json';

// ── Types ──────────────────────────────────────────────────────────────

export interface Row {
  [key: string]: any;
}

export interface Agency {
  name: string;
  gsa: string;
  currency: string;
  commission: number;
  active: boolean;
}

export interface User {
  gsa: string;
  currency: string;
}

export type AgenciesMap = Record<string, Agency>;
export type UsersMap = Record<string, User>;

// ── Constants ──────────────────────────────────────────────────────────

export const exchangeRates = {
  EUR: { DZD: 1 / 158, EUR: 1 },
  DZD: { EUR: 100, DZD: 1 },
};

export const agencies: AgenciesMap = agenciesData as AgenciesMap;
export const users: UsersMap = usersData as UsersMap;

// ── Utilities ──────────────────────────────────────────────────────────

export function generateId(): string {
  return uuidv4().replace(/-/g, '').slice(0, 8);
}

export function dateRangeStr(rows: Row[], col: string): string {
  if (!rows || rows.length === 0) return 'unknown~unknown';

  const dates = rows
    .map((row) => {
      const val = row[col];
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    })
    .filter((d) => d !== null);

  if (dates.length === 0) return 'unknown~unknown';

  // Use loop instead of spread to avoid call stack overflow on large arrays
  let minTime = dates[0]!.getTime();
  let maxTime = dates[0]!.getTime();
  for (let i = 1; i < dates.length; i++) {
    const time = dates[i]!.getTime();
    if (time < minTime) minTime = time;
    if (time > maxTime) maxTime = time;
  }

  const minDate = new Date(minTime);
  const maxDate = new Date(maxTime);

  const format = (d: Date) => d.toISOString().split('T')[0];
  return `${format(minDate)}~${format(maxDate)}`;
}

export function parseDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

export function getPaymentCurrencyAmount(
  user: string,
  bookingCurr: string,
  amount: number
): [number, string] {
  if (user === 'WEB') return [amount, bookingCurr];
  const userData = users[user];
  if (!userData) return [amount, bookingCurr]; // Fallback

  const currency = userData.currency;
  if (currency === 'DZD/EUR') return [amount, bookingCurr]; // WEB-like behavior

  const rate = exchangeRates[bookingCurr as keyof typeof exchangeRates]?.[
    currency as keyof (typeof exchangeRates)[keyof typeof exchangeRates]
  ];
  if (!rate) return [amount, bookingCurr];

  return [amount / rate, currency];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
