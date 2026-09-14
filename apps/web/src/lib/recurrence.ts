import { addMonths } from "date-fns";
import { parseDate, toISODate } from "./date";
import { RepeatConfig, Transaction } from "./types";
import { makeId } from "./seed";

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export const DEFAULT_REPEAT: RepeatConfig = {
  kind: "none",
  installments: 2,
  intervalMonths: 1,
  months: 12,
  indefinite: false,
};

const INDEFINITE_MONTHS = 24;

export function buildSeries(
  input: NewTransaction,
  repeat: RepeatConfig,
): NewTransaction[] {
  if (repeat.kind === "none") return [input];

  const start = parseDate(input.date);
  const seriesId = makeId("ser");

  if (repeat.kind === "installment") {
    const total = Math.max(2, Math.min(48, Math.round(repeat.installments)));
    const totalAmount = input.amount;
    const base = Math.floor((totalAmount / total) * 100) / 100;
    const last = Math.round((totalAmount - base * (total - 1)) * 100) / 100;
    return Array.from({ length: total }, (_, i) => ({
      ...input,
      amount: i === total - 1 ? last : base,
      date: toISODate(addMonths(start, i)),
      seriesId,
      seriesKind: "installment" as const,
      seriesIndex: i + 1,
      seriesTotal: total,
    }));
  }

  const total = repeat.indefinite
    ? INDEFINITE_MONTHS
    : Math.max(2, Math.min(60, Math.round(repeat.months)));
  return Array.from({ length: total }, (_, i) => ({
    ...input,
    amount: input.amount,
    date: toISODate(addMonths(start, i * repeat.intervalMonths)),
    seriesId,
    seriesKind: "recurring" as const,
    seriesIndex: i + 1,
    seriesTotal: total,
  }));
}

export function seriesLabel(t: Transaction): string | null {
  if (!t.seriesKind || !t.seriesTotal) return null;
  if (t.seriesKind === "installment") {
    return `parcela ${t.seriesIndex}/${t.seriesTotal}`;
  }
  return "recorrente";
}
