"use client";

import { useMemo, useState } from "react";
import { addMonths, startOfMonth } from "date-fns";
import { Check, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Goal } from "@/lib/types";
import { BUCKET_COLORS } from "@/lib/theme";
import { TAG_COLORS } from "@/lib/seed";
import { formatBRL } from "@/lib/format";
import { formatMonthShort, monthKey, monthRange, toISODate } from "@/lib/date";
import { PageBody, PageHeader } from "../PageHeader";
import { Button, EmptyState, Field, Input, Modal, Progress, cx } from "../ui";
import { MoneyInput } from "../MoneyInput";

export function EconomiasView() {
  const { state } = useStore();
  const [goalDialog, setGoalDialog] = useState<Goal | null | undefined>(
    undefined,
  );
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);

  const econ = useMemo(
    () => state.transactions.filter((t) => t.bucket === "economias"),
    [state.transactions],
  );

  const stats = useMemo(() => {
    const total = econ.reduce((a, t) => a + t.amount, 0);
    const thisKey = monthKey(new Date());
    const thisMonth = econ
      .filter((t) => t.date.startsWith(thisKey))
      .reduce((a, t) => a + t.amount, 0);
    const months = monthRange(startOfMonth(addMonths(new Date(), -11)), 12);
    const monthlySum = months.reduce(
      (a, m) =>
        a +
        econ
          .filter((t) => t.date.startsWith(monthKey(m)))
          .reduce((x, t) => x + t.amount, 0),
      0,
    );
    let running = econ
      .filter((t) => t.date < toISODate(months[0]))
      .reduce((a, t) => a + t.amount, 0);
    const monthly = months.map((m) => {
      const value = econ
        .filter((t) => t.date.startsWith(monthKey(m)))
        .reduce((x, t) => x + t.amount, 0);
      running += value;
      return { date: m, key: monthKey(m), value, accumulated: running };
    });
    const maxMonthly = Math.max(1, ...monthly.map((m) => m.value));
    const withoutGoal = econ
      .filter((t) => !t.goalId)
      .reduce((a, t) => a + t.amount, 0);
    return {
      total,
      thisMonth,
      avg: months.length ? monthlySum / months.length : 0,
      monthly,
      maxMonthly,
      withoutGoal,
    };
  }, [econ]);

  return (
    <>
      <PageHeader
        title="economias"
        subtitle="Metas e valores guardados"
      >
        <Button size="sm" onClick={() => setGoalDialog(null)}>
          <Plus className="h-4 w-4" /> nova meta
        </Button>
      </PageHeader>

      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi
              label="Total guardado"
              value={formatBRL(stats.total)}
              color={BUCKET_COLORS.economias}
            />
            <Kpi label="Este mês" value={formatBRL(stats.thisMonth)} />
            <Kpi
              label="Média mensal (12m)"
              value={formatBRL(stats.avg)}
            />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <PiggyBank
                className="h-4 w-4"
                style={{ color: BUCKET_COLORS.economias }}
              />
              <h2 className="text-sm font-bold">Metas</h2>
            </div>

            {state.goals.length === 0 ? (
              <EmptyState
                icon={<PiggyBank className="h-6 w-6" />}
                title="Nenhuma meta ainda"
                description="Crie uma meta (ex.: reserva, viagem) e vá adicionando valores."
                action={
                  <Button size="sm" onClick={() => setGoalDialog(null)}>
                    <Plus className="h-4 w-4" /> criar meta
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {state.goals.map((goal) => {
                  const saved = econ
                    .filter((t) => t.goalId === goal.id)
                    .reduce((a, t) => a + t.amount, 0);
                  const pct = goal.target
                    ? Math.min(100, (saved / goal.target) * 100)
                    : 0;
                  return (
                    <div
                      key={goal.id}
                      className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: goal.color }}
                          />
                          <span className="truncate text-sm font-bold">
                            {goal.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setGoalDialog(goal)}
                          aria-label={`Editar meta ${goal.name}`}
                          className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-end justify-between">
                          <span className="text-lg font-bold tabular-nums">
                            {formatBRL(saved)}
                          </span>
                          <span className="text-xs text-muted">
                            de {formatBRL(goal.target)}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          color={goal.color}
                          className="mt-2"
                        />
                        <p className="mt-1 text-[11px] text-muted">
                          {pct.toFixed(0)}% concluído
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setDepositGoal(goal)}>
                        <Plus className="h-4 w-4" /> adicionar valor
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Sem meta</h2>
              <span className="text-sm font-semibold tabular-nums">
                {formatBRL(stats.withoutGoal)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Economias que não estão vinculadas a nenhuma meta.
            </p>
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-4 text-sm font-bold">Por mês</h2>
            <div className="flex flex-col divide-y divide-line-soft">
              {stats.monthly.map((m) => (
                <div key={m.key} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-20 shrink-0 text-muted capitalize">
                    {formatMonthShort(m.date)}
                  </span>
                  <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-raised-2 sm:block">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(m.value / stats.maxMonthly) * 100}%`,
                        background: BUCKET_COLORS.economias,
                      }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right font-semibold tabular-nums">
                    {formatBRL(m.value)}
                  </span>
                  <span className="w-36 shrink-0 text-right text-xs text-muted tabular-nums">
                    guardado {formatBRL(m.accumulated)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </PageBody>

      {goalDialog !== undefined && (
        <GoalDialog
          goal={goalDialog}
          onClose={() => setGoalDialog(undefined)}
        />
      )}
      {depositGoal && (
        <DepositDialog
          goal={depositGoal}
          onClose={() => setDepositGoal(null)}
        />
      )}
    </>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <p className="text-[11px] font-semibold text-muted uppercase">{label}</p>
      <p
        className="mt-1 text-lg font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function GoalDialog({
  goal,
  onClose,
}: {
  goal: Goal | null;
  onClose: () => void;
}) {
  const { addGoal, updateGoal, deleteGoal } = useStore();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [color, setColor] = useState(goal?.color ?? TAG_COLORS[0]);

  const valid = name.trim().length > 0 && target > 0;

  function submit() {
    if (!valid) return;
    if (goal) {
      updateGoal(goal.id, { name: name.trim(), target, color });
    } else {
      addGoal({ name: name.trim(), target, color });
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={goal ? "Editar meta" : "Nova meta"}
      footer={
        <>
          {goal && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                deleteGoal(goal.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!valid}>
            <Check className="h-4 w-4" /> Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nome da meta">
          <Input
            autoFocus
            value={name}
            placeholder="Ex.: Reserva, Viagem, Entrada do carro"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Valor da meta">
          <MoneyInput value={target} onChange={setTarget} />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            Cor
          </span>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cx(
                  "h-7 w-7 rounded-full border-2",
                  color === c ? "border-ink" : "border-transparent",
                )}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function DepositDialog({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const { addTransaction } = useStore();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");

  function submit() {
    if (amount <= 0) return;
    addTransaction({
      bucket: "economias",
      amount,
      date,
      title: goal.name,
      description: note.trim(),
      tags: [],
      goalId: goal.id,
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Adicionar em “${goal.name}”`}
      description="Isso cria um lançamento de economia vinculado à meta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={amount <= 0}>
            <Check className="h-4 w-4" /> Adicionar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Valor">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
        <Field label="Data">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Observação" hint="Opcional">
          <Input
            value={note}
            placeholder="Ex.: 13º salário"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
