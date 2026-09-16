import { addDays, addMonths, addWeeks } from "date-fns";
import { parseDate, toISODate } from "./date";
import { RepeatConfig, RepeatUnit, Transaction } from "./types";
import { makeId } from "./seed";

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export const DEFAULT_REPEAT: RepeatConfig = {
  kind: "none",
  installments: 2,
  unit: "month",
  interval: 1,
  occurrences: 12,
  indefinite: false,
};

export const UNIT_LABELS: Record<RepeatUnit, string> = {
  day: "dia",
  week: "semana",
  month: "mês",
};

export const UNIT_ADVERBS: Record<RepeatUnit, string> = {
  day: "diária",
  week: "semanal",
  month: "mensal",
};

export const UNIT_PLURALS: Record<RepeatUnit, string> = {
  day: "dias",
  week: "semanas",
  month: "meses",
};

function addByUnit(date: Date, amount: number, unit: RepeatUnit): Date {
  if (unit === "day") return addDays(date, amount);
  if (unit === "week") return addWeeks(date, amount);
  return addMonths(date, amount);
}

const MAX_OCCURRENCES = 400;

function indefiniteTotal(unit: RepeatUnit, interval: number): number {
  const base = unit === "day" ? 366 : unit === "week" ? 53 : 24;
  return Math.max(2, Math.min(MAX_OCCURRENCES, Math.floor(base / Math.max(1, interval))));
}

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

  const interval = Math.max(1, Math.round(repeat.interval) || 1);
  const total = repeat.indefinite
    ? indefiniteTotal(repeat.unit, interval)
    : Math.max(2, Math.min(MAX_OCCURRENCES, Math.round(repeat.occurrences)));
  return Array.from({ length: total }, (_, i) => ({
    ...input,
    amount: input.amount,
    date: toISODate(addByUnit(start, i * interval, repeat.unit)),
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
