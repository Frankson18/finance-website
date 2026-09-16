"use client";

import { useMemo } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUCKETS, BUCKET_LABELS } from "@/lib/types";
import { BUCKET_COLORS, BUCKET_ICONS } from "@/lib/theme";
import { formatBRL } from "@/lib/format";
import {
  formatFullDate,
  formatMonthLong,
  formatMonthShort,
  monthKey,
  monthRange,
  toISODate,
  todayISO,
} from "@/lib/date";
import {
  balanceBefore,
  emptyBucketTotals,
  monthTransactions,
  netOf,
  sumTransactions,
} from "@/lib/calc";
import { PageBody, PageHeader } from "../PageHeader";
import { EmptyState, cx } from "../ui";
import { useUI } from "../ui-context";

export function HorizonteView() {
  const { state } = useStore();
  const { openTransactionDialog } = useUI();
  const today = todayISO();

  const {
    projection,
    averages,
    currentBalance,
    minIndex,
    savedToday,
    projectedEconomias,
    savedEnd,
  } = useMemo(() => {
    const now = startOfMonth(new Date());
    const monthStartISO = toISODate(now);
    const history = monthRange(addMonths(now, -6), 6);

    const econ = state.transactions.filter((t) => t.bucket === "economias");
    const savedToday = econ
      .filter((t) => t.date <= todayISO())
      .reduce((a, t) => a + t.amount, 0);
    const savedBefore = econ
      .filter((t) => t.date < monthStartISO)
      .reduce((a, t) => a + t.amount, 0);

    const histTotals = history
      .map((m) => sumTransactions(monthTransactions(state.transactions, monthKey(m))))
      .filter((t) => BUCKETS.some((b) => t[b] > 0));
    const divisor = Math.max(1, histTotals.length);
    const averages = histTotals.reduce((acc, t) => {
      for (const b of BUCKETS) acc[b] += t[b] / divisor;
      return acc;
    }, emptyBucketTotals());

    const startOpening = balanceBefore(
      state.transactions,
      state.settings.openingBalance,
      toISODate(now),
    );

    const futureMonths = monthRange(now, Math.max(1, state.settings.horizonMonths));
    let running = startOpening;
    let savedRunning = savedBefore;
    const rows = futureMonths.map((m) => {
      const key = monthKey(m);
      const actual = sumTransactions(monthTransactions(state.transactions, key));
      const hasActual = BUCKETS.some((b) => actual[b] > 0);
      const totals = hasActual ? actual : averages;
      const net = netOf(totals);
      running += net;
      savedRunning += totals.economias;
      return {
        date: m,
        key,
        totals,
        net,
        closing: running,
        hasActual,
        saved: savedRunning,
      };
    });

    let minIndex = 0;
    rows.forEach((r, i) => {
      if (r.closing < rows[minIndex].closing) minIndex = i;
    });

    const projectedEconomias = rows.reduce(
      (a, r) => a + r.totals.economias,
      0,
    );

    return {
      projection: rows,
      averages,
      currentBalance: startOpening,
      minIndex,
      savedToday,
      projectedEconomias,
      savedEnd: savedBefore + projectedEconomias,
    };
  }, [
    state.transactions,
    state.settings.openingBalance,
    state.settings.horizonMonths,
  ]);

  const futureTx = state.transactions
    .filter((t) => t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 12);

  const maxAbs = Math.max(1, ...projection.map((r) => Math.abs(r.closing)));
  const min = projection[minIndex];

  return (
    <>
      <PageHeader title="horizonte" subtitle="Projeção do seu saldo futuro" />

      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Saldo no início do período
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatBRL(currentBalance)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Resultado médio mensal
              </p>
              <p
                className={cx(
                  "mt-1 text-xl font-bold tabular-nums",
                  netOf(averages) >= 0 ? "text-[#4fa03f]" : "text-red",
                )}
              >
                {formatBRL(netOf(averages))}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Menor saldo projetado
              </p>
              <p
                className={cx(
                  "mt-1 text-xl font-bold tabular-nums",
                  min && min.closing >= 0 ? "text-ink" : "text-red",
                )}
              >
                {min ? formatBRL(min.closing) : "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Guardado hoje
              </p>
              <p
                className="mt-1 text-xl font-bold tabular-nums"
                style={{ color: BUCKET_COLORS.economias }}
              >
                {formatBRL(savedToday)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Economias projetadas ({state.settings.horizonMonths}m)
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatBRL(projectedEconomias)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs font-semibold text-muted uppercase">
                Guardado ao fim
              </p>
              <p
                className="mt-1 text-xl font-bold tabular-nums"
                style={{ color: BUCKET_COLORS.economias }}
              >
                {formatBRL(savedEnd)}
              </p>
            </div>
          </div>

          {min && min.closing < 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red/40 bg-red/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
              <p className="text-ink">
                Seu saldo pode ficar negativo em{" "}
                <span className="font-bold">
                  {formatMonthLong(min.date)}
                </span>
                . Considere reduzir saídas ou reforçar entradas.
              </p>
            </div>
          )}

          <section className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold">Saldo projetado mês a mês</h2>
            </div>
            <div className="no-scrollbar flex items-end gap-3 overflow-x-auto pb-1">
              {projection.map((r, i) => {
                const pct = (Math.abs(r.closing) / maxAbs) * 100;
                const positive = r.closing >= 0;
                return (
                  <div
                    key={r.key}
                    className="flex min-w-[58px] flex-1 flex-col items-center gap-2"
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-muted">
                      {formatBRL(r.closing).replace("R$", "").trim()}
                    </span>
                    <div className="flex h-36 w-full items-end justify-center">
                      <div
                        className={cx(
                          "w-6 rounded-t",
                          positive ? "bg-[#3a7a2f]" : "bg-red",
                          i === minIndex && "ring-2 ring-brand/70",
                        )}
                        style={{ height: `${Math.max(4, pct)}%` }}
                        title={`${formatMonthLong(r.date)} · ${formatBRL(
                          r.closing,
                        )}`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-muted capitalize">
                      {formatMonthShort(r.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-5">
            <section className="overflow-hidden rounded-xl border border-line bg-panel">
              <div className="border-b border-line-soft px-4 py-3">
                <h2 className="text-sm font-bold">Projeção detalhada</h2>
                <p className="text-xs text-muted">
                  Meses sem lançamentos usam a média dos últimos 6 meses.
                </p>
              </div>
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted uppercase">
                      <th className="px-4 py-2 font-semibold">mês</th>
                      <th className="px-3 py-2 text-right font-semibold">
                        entradas
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        saídas
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        economias
                      </th>
                      <th className="px-3 py-2 text-right font-semibold">
                        guardado
                      </th>
                      <th className="sticky right-0 border-l border-line-soft bg-panel px-4 py-2 text-right font-semibold">
                        saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projection.map((r) => {
                      const out =
                        r.totals.saidas +
                        r.totals.diarios +
                        r.totals.cartao;
                      return (
                        <tr
                          key={r.key}
                          className="border-b border-line-soft last:border-0"
                        >
                          <td className="px-4 py-2 font-semibold capitalize">
                            {formatMonthShort(r.date)}
                            {!r.hasActual && (
                              <span className="ml-2 rounded bg-raised-2 px-1.5 py-0.5 text-[10px] font-normal text-muted">
                                média
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#4fa03f]">
                            {formatBRL(r.totals.entradas)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-red">
                            {formatBRL(out)}
                          </td>
                          <td
                            className="px-3 py-2 text-right tabular-nums"
                            style={{ color: BUCKET_COLORS.economias }}
                          >
                            {formatBRL(r.totals.economias)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted">
                            {formatBRL(r.saved)}
                          </td>
                          <td
                            className={cx(
                              "sticky right-0 border-l border-line-soft bg-panel px-4 py-2 text-right font-semibold tabular-nums",
                              r.closing >= 0 ? "text-ink" : "text-red",
                            )}
                          >
                            {formatBRL(r.closing)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-panel">
              <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
                <CalendarClock className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold">Compromissos futuros</h2>
              </div>
              <div className="divide-y divide-line-soft">
                {futureTx.length === 0 && (
                  <div className="p-4">
                    <EmptyState
                      title="Nada agendado"
                      description="Sem movimentações com data futura."
                    />
                  </div>
                )}
                {futureTx.map((t) => {
                  const Icon = BUCKET_ICONS[t.bucket];
                  return (
                    <button
                      key={t.id}
                      onClick={() => openTransactionDialog({ id: t.id })}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised/40"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: `${BUCKET_COLORS[t.bucket]}22`,
                          color: BUCKET_COLORS[t.bucket],
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {t.title}
                        </span>
                        {t.description ? (
                          <span className="block truncate text-xs text-muted">
                            {t.description}
                          </span>
                        ) : null}
                        <span className="text-xs text-muted">
                          {formatFullDate(t.date)} · {BUCKET_LABELS[t.bucket]}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatBRL(t.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </PageBody>
    </>
  );
}
