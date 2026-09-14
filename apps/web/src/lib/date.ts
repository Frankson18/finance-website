import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseDate(iso: string): Date {
  return parseISO(`${iso}T00:00:00`);
}

export function monthKey(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return format(d, "yyyy-MM");
}

export function monthKeyToDate(key: string): Date {
  return parseISO(`${key}-01T00:00:00`);
}

export function formatMonthLong(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatMonthShort(date: Date): string {
  return format(date, "MMM/yyyy", { locale: ptBR });
}

export function formatMonthMedium(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatDayLabel(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function monthDays(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
}

export function daysInMonth(date: Date): number {
  return getDaysInMonth(date);
}

export function monthRange(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

export function addMonthsToKey(key: string, amount: number): string {
  return monthKey(addMonths(monthKeyToDate(key), amount));
}

export function isSameMonthKey(key: string, date: Date): boolean {
  return key === monthKey(date);
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

export function monthBounds(key: string): { start: string; end: string } {
  const d = monthKeyToDate(key);
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) };
}

export function formatDayMonth(iso: string): string {
  return format(parseDate(iso), "dd/MM", { locale: ptBR });
}

export function formatFullDate(iso: string): string {
  return format(parseDate(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function weekdayShort(date: Date): string {
  return format(date, "EEEEEE", { locale: ptBR });
}
