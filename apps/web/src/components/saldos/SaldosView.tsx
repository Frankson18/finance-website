"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Wallet,
} from "lucide-react";
import { addMonths, startOfMonth } from "date-fns";
import { useStore } from "@/lib/store";
import { useUI } from "../ui-context";
import { useLocalSet } from "@/lib/use-local";
import { BUCKETS, Bucket, BUCKET_LABELS } from "@/lib/types";
import { BUCKET_COLORS, BUCKET_ICONS } from "@/lib/theme";
import {
  formatMonthLong,
  formatMonthShort,
  monthKey,
  monthRange,
  todayISO,
  toISODate,
} from "@/lib/date";
import { formatBRL } from "@/lib/format";
import { saldoColor } from "@/lib/saldo";
import {
  balanceBefore,
  computeMonth,
  MonthComputation,
} from "@/lib/calc";
import { PageBody, PageHeader } from "../PageHeader";
import { Button, IconButton, Skeleton, cx } from "../ui";

const DAY_W = 48;
const BUCKET_W = 168;
const SALDO_W = 152;
const COLLAPSED_W = 44;

export function SaldosView() {
  const { state, ready } = useStore();
  const { openTransactionDialog } = useUI();
  const { set: checked, toggle } = useLocalSet("fluxo.checked-days");
  const [start, setStart] = useState(() => startOfMonth(new Date()));
  const [collapsed, setCollapsed] = useState<Set<Bucket>>(() => new Set());
  const [activeMonth, setActiveMonth] = useState(() => monthKey(new Date()));
  const [mobileColumn, setMobileColumn] = useState<MobileColumn>("saldos");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusSignal, setFocusSignal] = useState(0);

  useEffect(() => {
    const handler = () => {
      const now = new Date();
      setStart(startOfMonth(now));
      setActiveMonth(monthKey(now));
      setFocusSignal((s) => s + 1);
    };
    window.addEventListener("fluxo:today", handler);
    return () => window.removeEventListener("fluxo:today", handler);
  }, []);

  useEffect(() => {
    if (!focusSignal) return;
    const t = setTimeout(() => {
      document
        .getElementById(
          `${
            typeof window !== "undefined" && window.innerWidth < 1024
              ? "mday"
              : "day"
          }-${todayISO()}`,
        )
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => clearTimeout(t);
  }, [focusSignal]);

  const months = useMemo(() => monthRange(start, 12), [start]);

  const computed = useMemo(() => {
    let opening = balanceBefore(
      state.transactions,
      state.settings.openingBalance,
      toISODate(months[0]),
    );
    return months.map((date) => {
      const comp = computeMonth(state.transactions, date, opening);
      opening = comp.closing;
      return { date, comp };
    });
  }, [months, state.transactions, state.settings.openingBalance]);

  const toggleCollapse = (b: Bucket) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });

  const label = `${formatMonthShort(months[0])} - ${formatMonthShort(
    months[months.length - 1],
  )}`;

  return (
    <>
      <PageHeader title="saldos">
        <div className="flex items-center gap-1">
          <IconButton
            onClick={() => setStart((s) => addMonths(s, -12))}
            aria-label="Ano anterior"
          >
            <ChevronsLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            onClick={() => setStart((s) => addMonths(s, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="mx-1 hidden rounded-full border border-line-soft px-3 py-1.5 text-xs font-bold whitespace-nowrap sm:inline-block">
            {label}
          </span>
          <IconButton
            onClick={() => setStart((s) => addMonths(s, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <IconButton
            onClick={() => setStart((s) => addMonths(s, 12))}
            aria-label="Próximo ano"
          >
            <ChevronsRight className="h-4 w-4" />
          </IconButton>
          <Button
            size="sm"
            variant="secondary"
            className="ml-1"
            onClick={() => {
              setStart(startOfMonth(new Date()));
              setActiveMonth(monthKey(new Date()));
            }}
          >
            hoje
          </Button>
        </div>
      </PageHeader>

      {!ready ? (
        <PageBody className="p-4">
          <Skeleton className="h-[70vh] w-full" />
        </PageBody>
      ) : (
        <>
          {/* Desktop spreadsheet */}
          <PageBody className="hidden lg:block" scroll={false}>
            <div ref={scrollRef} className="h-full overflow-auto">
              <div className="flex min-w-max items-start gap-6 p-5">
                {computed.map(({ date, comp }) => (
                  <MonthGrid
                    key={comp.key}
                    date={date}
                    comp={comp}
                    checked={checked}
                    collapsed={collapsed}
                    onToggleCollapse={toggleCollapse}
                    onToggleChecked={toggle}
                    onCell={(d, b) =>
                      openTransactionDialog({ date: d, bucket: b })
                    }
                  />
                ))}
              </div>
            </div>
          </PageBody>

          {/* Mobile list */}
          <PageBody className="lg:hidden">
            <MobileMonths
              months={months.map((m) => m)}
              computed={computed}
              activeMonth={activeMonth}
              setActiveMonth={setActiveMonth}
              checked={checked}
              onToggleChecked={toggle}
              column={mobileColumn}
              setColumn={setMobileColumn}
            />
          </PageBody>
        </>
      )}
    </>
  );
}

function MonthGrid({
  date,
  comp,
  checked,
  collapsed,
  onToggleCollapse,
  onToggleChecked,
  onCell,
}: {
  date: Date;
  comp: MonthComputation;
  checked: Set<string>;
  collapsed: Set<Bucket>;
  onToggleCollapse: (b: Bucket) => void;
  onToggleChecked: (iso: string) => void;
  onCell: (date: string, bucket: Bucket) => void;
}) {
  const width =
    DAY_W +
    BUCKETS.reduce((acc, b) => acc + (collapsed.has(b) ? COLLAPSED_W : BUCKET_W), 0) +
    SALDO_W;
  const today = todayISO();

  return (
    <div style={{ width }} className="shrink-0">
      <div
        className="rounded-xl border border-line"
        style={{ width: width + 2 }}
      >
        <div
          className="sticky top-0 z-30 isolate w-full shadow-[0_8px_14px_-10px_rgba(0,0,0,0.85)]"
          style={{
            backgroundColor: "#1d1f23",
            backgroundImage: "linear-gradient(#1d1f23, #1d1f23)",
            willChange: "transform",
          }}
        >
          <div
            className="flex h-9 w-full items-center gap-2 border-b border-[#3a3e46] px-3"
            style={{ backgroundColor: "#1d1f23" }}
          >
            <h2 className="text-sm font-bold text-ink first-letter:uppercase">
              {formatMonthLong(date)}
            </h2>
            <span className="text-[11px] text-muted">
              {comp.count} dia(s) com lançamento
            </span>
          </div>
          <div
            className="flex h-[42px] w-full border-b border-[#3a3e46]"
            style={{ backgroundColor: "#1d1f23" }}
          >
          <div
            className="flex shrink-0 items-center justify-center border-r border-line-soft text-sm font-bold"
            style={{ width: DAY_W }}
          >
            dia
          </div>
          {BUCKETS.map((b) => {
            const isCollapsed = collapsed.has(b);
            const Icon = BUCKET_ICONS[b];
            return (
              <div
                key={b}
                className="flex shrink-0 items-center justify-between border-r border-line-soft px-3"
                style={{ width: isCollapsed ? COLLAPSED_W : BUCKET_W }}
              >
                <button
                  onClick={() => onToggleCollapse(b)}
                  aria-label={isCollapsed ? "Expandir coluna" : "Encolher coluna"}
                  className="text-muted hover:text-ink"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
                {isCollapsed ? (
                  <Icon className="h-4 w-4" style={{ color: BUCKET_COLORS[b] }} />
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4"
                      style={{ color: BUCKET_COLORS[b] }}
                    />
                    <span className="text-sm font-bold">{BUCKET_LABELS[b]}</span>
                  </span>
                )}
              </div>
            );
          })}
          <div
            className="flex shrink-0 items-center justify-center text-sm font-bold"
            style={{ width: SALDO_W }}
          >
            saldos
          </div>
          </div>
        </div>

        {comp.days.map((day) => {
          const isToday = day.date === today;
          return (
            <div
              key={day.date}
              id={`day-${day.date}`}
              className={cx(
                "flex h-10 w-full border-b border-line-soft",
                isToday && "bg-brand/[0.06]",
              )}
            >
              <button
                onClick={() => onToggleChecked(day.date)}
                aria-label={`Marcar check-in do dia ${day.day}`}
                className="relative flex shrink-0 items-center justify-center border-r border-line-soft text-sm font-medium text-muted hover:text-ink"
                style={{ width: DAY_W }}
              >
                {day.day}
                {checked.has(day.date) && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-green-bright" />
                )}
              </button>
              {BUCKETS.map((b) => {
                const isCollapsed = collapsed.has(b);
                const value = day[b];
                const Icon = BUCKET_ICONS[b];
                return (
                  <button
                    key={b}
                    onClick={() => onCell(day.date, b)}
                    className="group relative flex shrink-0 items-center justify-end border-r border-line-soft px-3 hover:bg-raised/50"
                    style={{ width: isCollapsed ? COLLAPSED_W : BUCKET_W }}
                  >
                    {!isCollapsed && (
                      <Plus
                        className="absolute left-3 h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    )}
                    {isCollapsed ? (
                      value > 0 && (
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: BUCKET_COLORS[b] }}
                        />
                      )
                    ) : (
                      <span className="flex items-center gap-2">
                        {day.counts[b] > 1 && (
                          <span
                            className="rounded bg-raised-2 px-1.5 py-0.5 text-[10px] font-bold text-muted"
                            title={`${day.counts[b]} lançamentos`}
                          >
                            {day.counts[b]}×
                          </span>
                        )}
                        <span
                          className={cx(
                            "text-sm font-medium tabular-nums",
                            value > 0 ? "text-ink" : "text-dim",
                          )}
                        >
                          {formatBRL(value)}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
              <div
                className="flex shrink-0 items-center justify-center transition-colors"
                style={{ width: SALDO_W, background: saldoColor(day.saldo) }}
              >
                <span className="text-sm font-medium tabular-nums text-white">
                  {formatBRL(day.saldo)}
                </span>
              </div>
            </div>
          );
        })}

        {Array.from({ length: Math.max(0, 31 - comp.days.length) }).map(
          (_, i) => {
            const dayNum = comp.days.length + i + 1;
            return (
              <div
                key={`pad-${comp.key}-${dayNum}`}
                className="flex h-10 w-full border-b border-line-soft"
              >
                <div
                  className="flex shrink-0 items-center justify-center border-r border-line-soft text-sm font-medium text-dim"
                  style={{ width: DAY_W }}
                >
                  {dayNum}
                </div>
                {BUCKETS.map((b) => (
                  <div
                    key={b}
                    className="flex shrink-0 items-center justify-end border-r border-line-soft px-3"
                    style={{
                      width: collapsed.has(b) ? COLLAPSED_W : BUCKET_W,
                    }}
                  >
                    <span className="text-sm text-dim">—</span>
                  </div>
                ))}
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{ width: SALDO_W, background: "#262a30" }}
                >
                  <span className="text-sm font-medium tabular-nums text-dim">
                    {formatBRL(comp.closing)}
                  </span>
                </div>
              </div>
            );
          },
        )}

        <div className="flex h-[41px] w-full rounded-b-xl border-t border-ink/40">
          <div
            className="shrink-0 border-r border-line-soft"
            style={{ width: DAY_W }}
          />
          {BUCKETS.map((b) => {
            const isCollapsed = collapsed.has(b);
            const Icon = BUCKET_ICONS[b];
            return (
              <div
                key={b}
                className="flex shrink-0 items-center justify-between border-r border-line-soft px-3"
                style={{ width: isCollapsed ? COLLAPSED_W : BUCKET_W }}
              >
                {!isCollapsed && (
                  <Icon
                    className="h-4 w-4"
                    style={{ color: BUCKET_COLORS[b] }}
                  />
                )}
                {isCollapsed ? (
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: BUCKET_COLORS[b] }}
                  >
                    {formatBRL(comp.totals[b])}
                  </span>
                ) : (
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {formatBRL(comp.totals[b])}
                  </span>
                )}
              </div>
            );
          })}
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: SALDO_W, background: saldoColor(comp.closing) }}
          >
            <span className="text-sm font-bold tabular-nums text-white">
              {formatBRL(comp.closing)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

type MobileColumn = "saldos" | Bucket;

function MobileMonths({
  months,
  computed,
  activeMonth,
  setActiveMonth,
  checked,
  onToggleChecked,
  column,
  setColumn,
}: {
  months: Date[];
  computed: { date: Date; comp: MonthComputation }[];
  activeMonth: string;
  setActiveMonth: (key: string) => void;
  checked: Set<string>;
  onToggleChecked: (iso: string) => void;
  column: MobileColumn;
  setColumn: (c: MobileColumn) => void;
}) {
  const { openTransactionDialog } = useUI();
  const active = computed.find((c) => c.comp.key === activeMonth) ?? computed[0];
  const today = todayISO();
  const columns: MobileColumn[] = ["saldos", ...BUCKETS];

  return (
    <div className="flex flex-col">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-3">
        {months.map((m) => {
          const key = monthKey(m);
          const isActive = key === activeMonth;
          return (
            <button
              key={key}
              onClick={() => setActiveMonth(key)}
              className={cx(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap",
                isActive
                  ? "border-brand/50 bg-brand/15 text-brand"
                  : "border-line text-muted",
              )}
            >
              {formatMonthShort(m)}
            </button>
          );
        })}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-3">
        {columns.map((col) => {
          const isActive = column === col;
          const Icon = col === "saldos" ? Wallet : BUCKET_ICONS[col];
          const color = col === "saldos" ? "#3b82f6" : BUCKET_COLORS[col];
          return (
            <button
              key={col}
              onClick={() => setColumn(col)}
              className={cx(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap",
                isActive
                  ? "border-transparent bg-brand text-white"
                  : "border-line text-muted",
              )}
            >
              <Icon
                className="h-3.5 w-3.5"
                style={{ color: isActive ? "#ffffff" : color }}
              />
              {col === "saldos" ? "saldos" : BUCKET_LABELS[col]}
            </button>
          );
        })}
      </div>

      <div className="border-t border-line">
        <div className="flex h-9 items-center px-3 text-[11px] font-bold tracking-wide text-muted uppercase">
          <span className="w-12">dia</span>
          <span className="flex-1 text-right">
            {column === "saldos" ? "saldos" : BUCKET_LABELS[column]}
          </span>
        </div>
        {active.comp.days.map((day) => {
          const isToday = day.date === today;
          const bucket = column === "saldos" ? null : column;
          const value = bucket ? day[bucket] : day.saldo;
          const color = saldoColor(day.saldo);
          return (
            <div
              key={day.date}
              id={`mday-${day.date}`}
              className={cx(
                "flex min-h-12 border-b border-line-soft",
                isToday && "bg-brand/[0.06]",
              )}
            >
              <button
                onClick={() => onToggleChecked(day.date)}
                aria-label={`Marcar check-in do dia ${day.day}`}
                className={cx(
                  "relative flex w-12 shrink-0 items-center justify-center border-r border-line-soft text-sm font-medium",
                  isToday ? "text-brand" : "text-muted",
                )}
              >
                {day.day}
                {checked.has(day.date) && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-green-bright" />
                )}
              </button>
              <button
                onClick={() =>
                  openTransactionDialog({
                    date: day.date,
                    bucket: bucket ?? "saidas",
                  })
                }
                className="flex flex-1 items-center justify-end px-3 py-2 text-right"
              >
                {column === "saldos" ? (
                  <span
                    className="w-full rounded-lg py-2.5 pr-3 text-right text-sm font-bold tabular-nums text-white"
                    style={{ background: color }}
                  >
                    {formatBRL(day.saldo)}
                  </span>
                ) : (
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {bucket && day.counts[bucket] > 1 && (
                        <span className="rounded bg-raised-2 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                          {day.counts[bucket]}×
                        </span>
                      )}
                      <span
                        className={cx(
                          "text-sm font-semibold tabular-nums",
                          value > 0 ? "text-ink" : "text-dim",
                        )}
                      >
                        {formatBRL(value)}
                      </span>
                    </span>
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold"
                      style={{ color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: color }}
                      />
                      saldo {formatBRL(day.saldo)}
                    </span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3 px-3 py-3">
          <span className="text-xs font-bold text-muted">
            {column === "saldos"
              ? `saldo final de ${formatMonthLong(active.date)}`
              : `total de ${BUCKET_LABELS[column]}`}
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={
              column === "saldos" ? { color: saldoColor(active.comp.closing) } : undefined
            }
          >
            {formatBRL(
              column === "saldos"
                ? active.comp.closing
                : active.comp.totals[column],
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
