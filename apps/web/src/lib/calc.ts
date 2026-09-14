import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import { BUCKETS, Bucket, Card, Transaction } from "./types";
import { monthDays, toISODate } from "./date";

export type BucketTotals = Record<Bucket, number>;

export function emptyBucketTotals(): BucketTotals {
  return { entradas: 0, saidas: 0, diarios: 0, economias: 0, cartao: 0 };
}

export function netOf(totals: BucketTotals): number {
  return (
    totals.entradas -
    totals.saidas -
    totals.diarios -
    totals.economias -
    totals.cartao
  );
}

export function sumTransactions(transactions: Transaction[]): BucketTotals {
  const totals = emptyBucketTotals();
  for (const t of transactions) totals[t.bucket] += t.amount;
  return totals;
}

export function balanceBefore(
  transactions: Transaction[],
  openingBalance: number,
  isoExclusive: string,
): number {
  const before = transactions.filter((t) => t.date < isoExclusive);
  return openingBalance + netOf(sumTransactions(before));
}

export interface DayTotals extends BucketTotals {
  day: number;
  date: string;
  net: number;
  saldo: number;
  counts: BucketTotals;
}

export interface MonthComputation {
  key: string;
  days: DayTotals[];
  totals: BucketTotals;
  net: number;
  opening: number;
  closing: number;
  count: number;
}

export function computeMonth(
  transactions: Transaction[],
  monthDate: Date,
  opening: number,
): MonthComputation {
  const key = format(monthDate, "yyyy-MM");
  const byDate = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.date.startsWith(key)) {
      const list = byDate.get(t.date) ?? [];
      list.push(t);
      byDate.set(t.date, list);
    }
  }

  let running = opening;
  const totals = emptyBucketTotals();
  const days: DayTotals[] = monthDays(monthDate).map((d) => {
    const iso = toISODate(d);
    const items = byDate.get(iso) ?? [];
    const dayTotals = sumTransactions(items);
    const counts = emptyBucketTotals();
    for (const b of BUCKETS) {
      totals[b] += dayTotals[b];
      counts[b] = items.filter((t) => t.bucket === b).length;
    }
    const net = netOf(dayTotals);
    running += net;
    return {
      ...dayTotals,
      day: d.getDate(),
      date: iso,
      net,
      saldo: running,
      counts,
    };
  });

  return {
    key,
    days,
    totals,
    net: netOf(totals),
    opening,
    closing: running,
    count: byDate.size,
  };
}

export function monthTransactions(
  transactions: Transaction[],
  key: string,
  bucket?: Bucket,
): Transaction[] {
  return transactions
    .filter((t) => t.date.startsWith(key) && (!bucket || t.bucket === bucket))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function dayTransactions(
  transactions: Transaction[],
  iso: string,
  bucket?: Bucket,
): Transaction[] {
  return transactions.filter(
    (t) => t.date === iso && (!bucket || t.bucket === bucket),
  );
}

export interface CardInvoice {
  key: string;
  closing: string;
  due: string;
  total: number;
  items: Transaction[];
}

export function invoiceReferenceDate(card: Card, purchaseISO: string): Date {
  const purchase = parseISO(`${purchaseISO}T00:00:00`);
  const day = purchase.getDate();
  const base = startOfMonth(purchase);
  if (day <= card.closingDay) return base;
  return startOfMonth(addMonths(purchase, 1));
}

export function cardInvoice(
  transactions: Transaction[],
  card: Card,
  reference: Date,
): CardInvoice {
  const items = transactions.filter(
    (t) =>
      t.bucket === "cartao" &&
      t.cardId === card.id &&
      invoiceReferenceDate(card, t.date).getTime() === reference.getTime(),
  );
  const total = items.reduce((acc, t) => acc + t.amount, 0);
  const closing = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    card.closingDay,
  );
  const due = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    card.dueDay,
  );
  return {
    key: format(reference, "yyyy-MM"),
    closing: toISODate(closing),
    due: toISODate(due),
    total,
    items: items.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function nextInvoiceReference(card: Card, today = new Date()): Date {
  const base = startOfMonth(today);
  if (today.getDate() <= card.closingDay) return base;
  return startOfMonth(addMonths(today, 1));
}

export function cardUsed(transactions: Transaction[], cardId: string): number {
  const total = transactions
    .filter((t) => t.bucket === "cartao" && t.cardId === cardId)
    .reduce((acc, t) => acc + t.amount, 0);
  const paid = 0; // future: invoices paid
  return Math.max(0, total - paid);
}

export function transactionsInRange(
  transactions: Transaction[],
  startISO: string,
  endISO: string,
): Transaction[] {
  return transactions.filter((t) => t.date >= startISO && t.date <= endISO);
}

export function monthlyTotals(
  transactions: Transaction[],
  keys: string[],
): { key: string; totals: BucketTotals; net: number }[] {
  return keys.map((key) => {
    const totals = sumTransactions(monthTransactions(transactions, key));
    return { key, totals, net: netOf(totals) };
  });
}

export function isWithin(iso: string, startISO: string, endISO: string): boolean {
  const d = parseISO(`${iso}T00:00:00`);
  return (
    !isBefore(d, parseISO(`${startISO}T00:00:00`)) &&
    !isAfter(d, parseISO(`${endISO}T00:00:00`))
  );
}

export function monthEndISO(date: Date): string {
  return toISODate(endOfMonth(date));
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
