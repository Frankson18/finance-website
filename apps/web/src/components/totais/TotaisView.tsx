"use client";

import { useMemo, useState } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUCKETS, BUCKET_LABELS } from "@/lib/types";
import { BUCKET_COLORS } from "@/lib/theme";
import { formatBRL } from "@/lib/format";
import {
  formatMonthShort,
  monthKey,
  monthRange,
  toISODate,
} from "@/lib/date";
import {
  balanceBefore,
  emptyBucketTotals,
  monthTransactions,
  netOf,
  sumTransactions,
} from "@/lib/calc";
import { PageBody, PageHeader } from "../PageHeader";
import { IconButton, cx } from "../ui";

export function TotaisView() {
  const { state } = useStore();
  const [start, setStart] = useState(() =>
    startOfMonth(addMonths(new Date(), -11)),
  );
  const months = useMemo(() => monthRange(start, 12), [start]);

  const rows = useMemo(() => {
    let opening = balanceBefore(
      state.transactions,
      state.settings.openingBalance,
      toISODate(months[0]),
    );
    return months.map((m) => {
      const totals = sumTransactions(
        monthTransactions(state.transactions, monthKey(m)),
      );
      const net = netOf(totals);
      const closing = opening + net;
      const row = { date: m, key: monthKey(m), totals, net, opening, closing };
      opening = closing;
      return row;
    });
  }, [months, state.transactions, state.settings.openingBalance]);

  const sum = useMemo(() => {
    const totals = rows.reduce((acc, r) => {
      for (const b of BUCKETS) acc[b] += r.totals[b];
      return acc;
    }, emptyBucketTotals());
    return { totals, net: netOf(totals) };
  }, [rows]);

  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.totals.entradas, r.totals.saidas]),
  );
  const currentBalance = rows.length ? rows[rows.length - 1].closing : 0;
  const savingsRate = sum.totals.entradas
    ? (sum.totals.economias / sum.totals.entradas) * 100
    : 0;

  return (
    <>
      <PageHeader title="totais" subtitle="Resumo dos últimos 12 meses">
        <div className="flex items-center gap-1">
          <IconButton
            onClick={() => setStart((s) => addMonths(s, -12))}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="mx-1 hidden text-xs font-bold whitespace-nowrap sm:inline">
            {formatMonthShort(months[0])} - {formatMonthShort(months[11])}
          </span>
          <IconButton
            onClick={() => setStart((s) => addMonths(s, 12))}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </PageHeader>

      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Entradas"
              value={formatBRL(sum.totals.entradas)}
              icon={<TrendingUp className="h-4 w-4" />}
              color="#4fa03f"
            />
            <Kpi
              label="Saídas totais"
              value={formatBRL(
                sum.totals.saidas +
                  sum.totals.diarios +
                  sum.totals.economias +
                  sum.totals.cartao,
              )}
              icon={<TrendingDown className="h-4 w-4" />}
              color="#e5484d"
            />
            <Kpi
              label="Resultado"
              value={formatBRL(sum.net)}
              icon={
                sum.net >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )
              }
              color={sum.net >= 0 ? "#4fa03f" : "#e5484d"}
            />
            <Kpi
              label="Saldo atual"
              value={formatBRL(currentBalance)}
              icon={<Wallet className="h-4 w-4" />}
              color="#3b82f6"
            />
          </div>

          <section className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Entradas x saídas por mês</h2>
              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#4fa03f]" /> entradas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#e5484d]" /> saídas
                </span>
              </div>
            </div>
            <div className="no-scrollbar flex items-end gap-3 overflow-x-auto pb-1">
              {rows.map((r) => (
                <div
                  key={r.key}
                  className="flex min-w-[54px] flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-40 items-end gap-1">
                    <div
                      className="w-4 rounded-t bg-[#4fa03f]"
                      style={{ height: `${(r.totals.entradas / max) * 100}%` }}
                      title={`Entradas ${formatBRL(r.totals.entradas)}`}
                    />
                    <div
                      className="w-4 rounded-t bg-[#e5484d]"
                      style={{
                        height: `${
                          ((r.totals.saidas +
                            r.totals.diarios +
                            r.totals.economias +
                            r.totals.cartao) /
                            max) *
                          100
                        }%`,
                      }}
                      title={`Saídas ${formatBRL(
                        r.totals.saidas +
                          r.totals.diarios +
                          r.totals.economias +
                          r.totals.cartao,
                      )}`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted capitalize">
                    {formatMonthShort(r.date)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="no-scrollbar overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted uppercase">
                    <th className="px-4 py-3 font-semibold">mês</th>
                    {BUCKETS.map((b) => (
                      <th key={b} className="px-3 py-3 text-right font-semibold">
                        {BUCKET_LABELS[b]}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right font-semibold">
                      resultado
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      saldo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.key}
                      className="border-b border-line-soft last:border-0 hover:bg-raised/40"
                    >
                      <td className="px-4 py-3 font-semibold capitalize">
                        {formatMonthShort(r.date)}
                      </td>
                      {BUCKETS.map((b) => (
                        <td
                          key={b}
                          className={cx(
                            "px-3 py-3 text-right tabular-nums",
                            r.totals[b] === 0 ? "text-dim" : "text-ink",
                          )}
                        >
                          {formatBRL(r.totals[b])}
                        </td>
                      ))}
                      <td
                        className={cx(
                          "px-3 py-3 text-right font-semibold tabular-nums",
                          r.net >= 0 ? "text-[#4fa03f]" : "text-red",
                        )}
                      >
                        {formatBRL(r.net)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatBRL(r.closing)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-raised/40 font-bold">
                    <td className="px-4 py-3">total</td>
                    {BUCKETS.map((b) => (
                      <td
                        key={b}
                        className="px-3 py-3 text-right tabular-nums"
                        style={{ color: BUCKET_COLORS[b] }}
                      >
                        {formatBRL(sum.totals[b])}
                      </td>
                    ))}
                    <td
                      className={cx(
                        "px-3 py-3 text-right tabular-nums",
                        sum.net >= 0 ? "text-[#4fa03f]" : "text-red",
                      )}
                    >
                      {formatBRL(sum.net)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatBRL(currentBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <p className="text-xs text-muted">
            Taxa de economia no período:{" "}
            <span className="font-bold text-ink">
              {savingsRate.toFixed(1)}%
            </span>{" "}
            das entradas foram para economias.
          </p>
        </div>
      </PageBody>
    </>
  );
}

function Kpi({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}
