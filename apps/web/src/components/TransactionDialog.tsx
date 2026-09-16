"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  BUCKETS,
  Bucket,
  BUCKET_LABELS,
  RepeatConfig,
  RepeatUnit,
  Transaction,
} from "@/lib/types";
import { BUCKET_COLORS, BUCKET_ICONS } from "@/lib/theme";
import {
  buildSeries,
  DEFAULT_REPEAT,
  seriesLabel,
  UNIT_ADVERBS,
  UNIT_LABELS,
  UNIT_PLURALS,
} from "@/lib/recurrence";
import {
  formatFullDate,
  formatMonthShort,
  todayISO,
  toISODate,
} from "@/lib/date";
import { formatBRL, plural } from "@/lib/format";
import { Badge, Button, Field, Input, Modal, Select, Textarea, cx } from "./ui";
import { MoneyInput } from "./MoneyInput";
import { TransactionPrefill, useUI } from "./ui-context";

interface FormState {
  id?: string;
  bucket: Bucket;
  amount: number;
  date: string;
  title: string;
  description: string;
  tags: string[];
  cardId?: string;
}

function emptyForm(prefill?: TransactionPrefill): FormState {
  return {
    id: prefill?.id,
    bucket: prefill?.bucket ?? "saidas",
    amount: 0,
    date: prefill?.date ?? todayISO(),
    title: "",
    description: "",
    tags: [],
    cardId: prefill?.cardId,
  };
}

export function TransactionDialog({
  open,
  prefill,
  onClose,
}: {
  open: boolean;
  prefill?: TransactionPrefill;
  onClose: () => void;
}) {
  const { state, addTransactions, updateTransaction, deleteTransaction } =
    useStore();
  const [form, setForm] = useState<FormState>(() => emptyForm(prefill));
  const [repeat, setRepeat] = useState<RepeatConfig>(DEFAULT_REPEAT);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRepeat(DEFAULT_REPEAT);
    const existing = prefill?.id
      ? state.transactions.find((t) => t.id === prefill.id)
      : undefined;
    if (existing) {
      const hasTitle = Boolean(existing.title?.trim());
      setForm({
        id: existing.id,
        bucket: existing.bucket,
        amount: existing.amount,
        date: existing.date,
        title: hasTitle ? existing.title : existing.description,
        description: hasTitle ? existing.description : "",
        tags: existing.tags,
        cardId: existing.cardId,
      });
    } else {
      setForm(emptyForm(prefill));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  const cellItems: Transaction[] = useMemo(() => {
    if (!prefill?.date || !prefill?.bucket || prefill?.id) return [];
    return state.transactions
      .filter((t) => t.date === prefill.date && t.bucket === prefill.bucket)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [prefill, state.transactions]);

  const card = state.cards.find((c) => c.id === form.cardId);
  const invoiceHint = useMemo(() => {
    if (form.bucket !== "cartao" || !card) return null;
    const d = new Date(`${form.date}T00:00:00`);
    const ref =
      d.getDate() <= card.closingDay
        ? new Date(d.getFullYear(), d.getMonth(), 1)
        : new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return `Entra na fatura de ${formatMonthShort(ref)}`;
  }, [form.bucket, form.date, card]);

  const editingTx = form.id
    ? state.transactions.find((t) => t.id === form.id)
    : undefined;
  const editingSeries = editingTx?.seriesId;

  const repeatPreview = useMemo(() => {
    if (repeat.kind === "none" || form.id) return null;
    if (repeat.kind === "installment") {
      const n = Math.max(2, Math.round(repeat.installments));
      return `${n}x de ${formatBRL(form.amount / n)} · ${formatBRL(
        form.amount,
      )} no total`;
    }
    const every =
      repeat.interval > 1
        ? `a cada ${repeat.interval} ${UNIT_PLURALS[repeat.unit]}`
        : UNIT_ADVERBS[repeat.unit];
    const duration = repeat.indefinite
      ? "sem data para acabar"
      : `${repeat.occurrences} vezes`;
    return `${every}, ${duration} · ${formatBRL(form.amount)} por lançamento`;
  }, [repeat, form.amount, form.id]);

  const valid =
    form.amount > 0 &&
    form.date &&
    (form.id || repeat.kind !== "installment" || repeat.installments >= 2);

  function submit(keepOpen = false) {
    if (!valid) return;
    const payload = {
      bucket: form.bucket,
      amount: form.amount,
      date: form.date,
      title: form.title.trim() || BUCKET_LABELS[form.bucket],
      description: form.description.trim(),
      tags: form.tags,
      cardId: form.bucket === "cartao" ? form.cardId : undefined,
    };
    if (form.id) {
      updateTransaction(form.id, payload);
      onClose();
      return;
    }
    addTransactions(buildSeries(payload, repeat));
    if (keepOpen) {
      setForm({
        bucket: form.bucket,
        amount: 0,
        date: form.date,
        title: "",
        description: "",
        tags: [],
        cardId: form.cardId,
      });
      setRepeat(DEFAULT_REPEAT);
    } else {
      onClose();
    }
  }

  function handleDelete(id: string) {
    deleteTransaction(id);
    if (form.id === id) setForm(emptyForm(prefill));
  }

  function requestDelete(tx: Transaction) {
    setPendingDelete(tx);
  }

  function selectForEdit(t: Transaction) {
    const hasTitle = Boolean(t.title?.trim());
    setForm({
      id: t.id,
      bucket: t.bucket,
      amount: t.amount,
      date: t.date,
      title: hasTitle ? t.title : t.description,
      description: hasTitle ? t.description : "",
      tags: t.tags,
      cardId: t.cardId,
    });
    setRepeat(DEFAULT_REPEAT);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function startNew() {
    setForm({
      bucket: form.bucket,
      amount: 0,
      date: form.date,
      title: "",
      description: "",
      tags: [],
      cardId: form.cardId,
    });
    setRepeat(DEFAULT_REPEAT);
  }

  function deleteSeries(seriesId: string) {
    for (const t of state.transactions.filter((x) => x.seriesId === seriesId)) {
      deleteTransaction(t.id);
    }
  }

  const pendingSeriesCount = pendingDelete?.seriesId
    ? state.transactions.filter((t) => t.seriesId === pendingDelete.seriesId)
        .length
    : 0;

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? "Editar movimentação" : "Nova movimentação"}
      description={
        form.id
          ? `${form.title.trim() || BUCKET_LABELS[form.bucket]} · ${formatBRL(form.amount)}`
          : prefill?.date && prefill?.bucket
            ? `${BUCKET_LABELS[prefill.bucket]} · ${formatFullDate(prefill.date)}`
            : undefined
      }
      footer={
        <>
          {editingTx && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => requestDelete(editingTx)}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {!form.id && (
            <Button
              variant="outline"
              onClick={() => submit(true)}
              disabled={!valid}
            >
              <Plus className="h-4 w-4" /> Salvar e adicionar outro
            </Button>
          )}
          <Button onClick={() => submit(false)} disabled={!valid}>
            <Check className="h-4 w-4" />
            {form.id ? "Salvar alterações" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {cellItems.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-line-soft bg-raised/40 p-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Já lançado neste dia · {cellItems.length}
            </p>
            {cellItems.map((t) => (
              <div
                key={t.id}
                className={cx(
                  "flex items-center gap-1 rounded-lg",
                  t.id === form.id
                    ? "bg-brand/10 ring-1 ring-brand/40 ring-inset"
                    : "hover:bg-raised-2",
                )}
              >
                <button
                  onClick={() => selectForEdit(t)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="block truncate text-sm text-ink">
                        {t.title?.trim() ? t.title : t.description}
                      </span>
                      {t.id === form.id && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                          <Pencil className="h-2.5 w-2.5" /> editando
                        </span>
                      )}
                    </span>
                    {t.title?.trim() && t.description ? (
                      <span className="block truncate text-xs text-muted">
                        {t.description}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted">
                      {[
                        seriesLabel(t),
                        t.tags.length > 0
                          ? `${t.tags.length} ${plural(t.tags.length, "tag", "tags")}`
                          : "sem tags",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-ink">
                    {formatBRL(t.amount)}
                  </span>
                </button>
                <button
                  onClick={() => requestDelete(t)}
                  aria-label={`Excluir ${t.title || t.description}`}
                  className="shrink-0 rounded-lg p-2 text-muted hover:bg-red/15 hover:text-red"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {form.id && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-brand">
              <Pencil className="h-3.5 w-3.5" /> Editando lançamento
            </span>
            <button
              onClick={startNew}
              className="text-xs font-semibold text-brand underline hover:no-underline"
            >
              Novo lançamento
            </button>
          </div>
        )}

        <div ref={formRef} className="grid grid-cols-5 gap-2">
          {BUCKETS.map((b) => {
            const Icon = BUCKET_ICONS[b];
            const active = form.bucket === b;
            return (
              <button
                key={b}
                onClick={() => setForm((f) => ({ ...f, bucket: b }))}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-transparent text-white"
                    : "border-line text-muted hover:bg-raised",
                )}
                style={
                  active ? { background: BUCKET_COLORS[b] } : undefined
                }
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: active ? "#ffffff" : BUCKET_COLORS[b] }}
                />
                {BUCKET_LABELS[b]}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Valor">
            <MoneyInput
              value={form.amount}
              autoFocus
              onChange={(amount) => setForm((f) => ({ ...f, amount }))}
            />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
            />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          {[
            { label: "Hoje", offset: 0 },
            { label: "Ontem", offset: -1 },
            { label: "Amanhã", offset: 1 },
          ].map((q) => (
            <Button
              key={q.label}
              size="sm"
              variant="outline"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + q.offset);
                setForm((f) => ({ ...f, date: toISODate(d) }));
              }}
            >
              {q.label}
            </Button>
          ))}
        </div>

        <Field label="Título">
          <Input
            value={form.title}
            placeholder="Ex.: Supermercado, Salário, Uber…"
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
          />
        </Field>

        <Field label="Descrição" hint="Opcional">
          <Textarea
            value={form.description}
            placeholder="Detalhes, observações…"
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </Field>

        {form.bucket === "cartao" && (
          <Field label="Cartão" hint={invoiceHint ?? undefined}>
            <Select
              value={form.cardId ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cardId: e.target.value || undefined,
                }))
              }
            >
              <option value="">Sem cartão</option>
              {state.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.brand}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              Tags
            </span>
            <Link
              href="/tags"
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              gerenciar tags
            </Link>
          </div>
          {state.tags.length === 0 && (
            <p className="text-xs text-muted">
              Você ainda não tem tags. Crie uma em “nova tag” abaixo — depois
              elas ficam disponíveis aqui para marcar ou desmarcar.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {state.tags.map((tag) => {
              const active = form.tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      tags: active
                        ? f.tags.filter((id) => id !== tag.id)
                        : [...f.tags, tag.id],
                    }))
                  }
                >
                  <Badge
                    color={active ? tag.color : undefined}
                    className={cx(
                      "cursor-pointer",
                      !active && "border-line text-muted hover:text-ink",
                    )}
                  >
                    {active ? <Check className="h-3 w-3" /> : null}
                    {tag.name}
                  </Badge>
                </button>
              );
            })}
            <NewTagButton
              onCreated={(id) =>
                setForm((f) => ({ ...f, tags: [...f.tags, id] }))
              }
            />
          </div>
        </div>

        {!form.id && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">
              Repetição
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "none", label: "Única" },
                { k: "installment", label: "Parcelado" },
                { k: "recurring", label: "Recorrente" },
              ].map((opt) => (
                <button
                  key={opt.k}
                  onClick={() =>
                    setRepeat((r) => ({
                      ...r,
                      kind: opt.k as RepeatConfig["kind"],
                    }))
                  }
                  className={cx(
                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                    repeat.kind === opt.k
                      ? "border-transparent bg-brand text-white"
                      : "border-line text-muted hover:bg-raised",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {repeat.kind === "installment" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Número de parcelas">
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    value={repeat.installments}
                    onChange={(e) =>
                      setRepeat((r) => ({
                        ...r,
                        installments: Number(e.target.value) || 2,
                      }))
                    }
                  />
                </Field>
                <div className="flex items-end pb-2 text-sm font-semibold text-ink">
                  {repeatPreview}
                </div>
              </div>
            )}

            {repeat.kind === "recurring" && (
              <div className="flex flex-col gap-3">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Frequência">
                    <Select
                      value={repeat.unit}
                      onChange={(e) =>
                        setRepeat((r) => ({
                          ...r,
                          unit: e.target.value as RepeatUnit,
                        }))
                      }
                    >
                      <option value="day">Diária</option>
                      <option value="week">Semanal</option>
                      <option value="month">Mensal</option>
                    </Select>
                  </Field>
                  <Field label="A cada">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={repeat.interval}
                        onChange={(e) =>
                          setRepeat((r) => ({
                            ...r,
                            interval: Number(e.target.value) || 1,
                          }))
                        }
                      />
                      <span className="shrink-0 text-xs text-muted">
                        {repeat.interval > 1
                          ? UNIT_PLURALS[repeat.unit]
                          : UNIT_LABELS[repeat.unit]}
                      </span>
                    </div>
                  </Field>
                  <Field label="Repetições">
                    <Input
                      type="number"
                      min={2}
                      max={400}
                      disabled={repeat.indefinite}
                      value={repeat.occurrences}
                      onChange={(e) =>
                        setRepeat((r) => ({
                          ...r,
                          occurrences: Number(e.target.value) || 2,
                        }))
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRepeat((r) => ({ ...r, indefinite: !r.indefinite }))
                  }
                  className="flex w-fit items-center gap-2 text-xs font-semibold text-muted hover:text-ink"
                >
                  <span
                    className={cx(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      repeat.indefinite
                        ? "border-brand bg-brand text-white"
                        : "border-line",
                    )}
                  >
                    {repeat.indefinite ? <Check className="h-3 w-3" /> : null}
                  </span>
                  Sem data para acabar
                </button>
                <p className="text-xs text-muted">{repeatPreview}</p>
              </div>
            )}
          </div>
        )}

        {editingTx && editingSeries && (
          <div className="rounded-xl border border-line-soft bg-raised/40 p-3 text-xs text-muted">
            {seriesLabel(editingTx)}
            {editingTx.seriesKind === "installment"
              ? " · parte de uma compra parcelada"
              : " · parte de uma recorrência"}
          </div>
        )}
      </div>
    </Modal>
    <Modal
      open={pendingDelete !== null}
      onClose={() => setPendingDelete(null)}
      size="sm"
      title="Excluir lançamento"
      description={
        pendingDelete
          ? `${pendingDelete.title || pendingDelete.description} · ${formatBRL(pendingDelete.amount)}`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancelar
          </Button>
          {pendingDelete?.seriesId ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (!pendingDelete) return;
                  handleDelete(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                Somente esta
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!pendingDelete?.seriesId) return;
                  const seriesId = pendingDelete.seriesId;
                  const belongsToEdited =
                    !!editingSeries && editingSeries === seriesId;
                  deleteSeries(seriesId);
                  setPendingDelete(null);
                  if (belongsToEdited) onClose();
                }}
              >
                Toda a série ({pendingSeriesCount})
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              onClick={() => {
                if (!pendingDelete) return;
                handleDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          )}
        </>
      }
    >
      <p className="text-sm text-muted">
        {pendingDelete?.seriesId ? (
          <>
            {pendingDelete.seriesKind === "installment"
              ? "Este lançamento faz parte de uma compra parcelada."
              : "Este lançamento faz parte de uma recorrência."}{" "}
            Quer apagar apenas este ou todos os {pendingSeriesCount} lançamentos
            da série?
          </>
        ) : (
          <>
            Tem certeza que quer apagar{" "}
            <span className="font-semibold text-ink">
              {pendingDelete?.title || pendingDelete?.description}
            </span>
            ? Essa ação não pode ser desfeita.
          </>
        )}
      </p>
    </Modal>
    </>
  );
}

function NewTagButton({ onCreated }: { onCreated: (id: string) => void }) {
  const { addTag } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <Plus className="h-3 w-3" /> nova tag
      </button>
    );
  }

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const palette = [
      "#3b82f6",
      "#a855f7",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
      "#14b8a6",
    ];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const tag = addTag(trimmed, color);
    onCreated(tag.id);
    setName("");
    setEditing(false);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
        placeholder="nome"
        className="h-6 w-24 rounded-full border border-line bg-raised px-2 text-[11px] text-ink outline-none"
      />
      <Button size="sm" className="h-6 px-2 text-[11px]" onClick={create}>
        ok
      </Button>
    </span>
  );
}
