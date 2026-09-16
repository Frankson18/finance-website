"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Tags as TagsIcon, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { BUCKET_LABELS, Tag } from "@/lib/types";
import { BUCKET_COLORS, BUCKET_ICONS } from "@/lib/theme";
import { TAG_COLORS } from "@/lib/seed";
import { formatBRL, plural } from "@/lib/format";
import { formatDayMonth } from "@/lib/date";
import { PageBody, PageHeader } from "../PageHeader";
import { Button, EmptyState, Input, cx } from "../ui";
import { useUI } from "../ui-context";

export function TagsView() {
  const { state, addTag, updateTag, deleteTag } = useStore();
  const { openTransactionDialog } = useUI();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return state.tags.map((tag) => {
      const txs = state.transactions.filter((t) => t.tags.includes(tag.id));
      const total = txs.reduce((acc, t) => acc + t.amount, 0);
      const inflow = txs
        .filter((t) => t.bucket === "entradas")
        .reduce((acc, t) => acc + t.amount, 0);
      const outflow = total - inflow;
      return { tag, count: txs.length, total, inflow, outflow };
    });
  }, [state.tags, state.transactions]);

  const selectedTx = useMemo(() => {
    if (!selected) return [];
    return state.transactions
      .filter((t) => t.tags.includes(selected))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, state.transactions]);

  function create() {
    const name = newName.trim();
    if (!name) return;
    const tag = addTag(name, newColor);
    setNewName("");
    setCreating(false);
    setSelected(tag.id);
  }

  return (
    <>
      <PageHeader
        title="tags"
        subtitle={`${state.tags.length} ${plural(
          state.tags.length,
          "etiqueta",
          "etiquetas",
        )}`}
      >
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> nova tag
        </Button>
      </PageHeader>

      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-3">
            {creating && (
              <div className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={newName}
                    placeholder="Nome da tag"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && create()}
                  />
                  <Button onClick={create} disabled={!newName.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
            )}

            {state.tags.length === 0 && !creating && (
              <EmptyState
                icon={<TagsIcon className="h-6 w-6" />}
                title="Nenhuma tag ainda"
                description="Crie etiquetas para classificar e cruzar movimentações."
                action={
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4" /> criar tag
                  </Button>
                }
              />
            )}

            {stats.map(({ tag, count, inflow, outflow }) => {
              const active = selected === tag.id;
              const editing = editingId === tag.id;
              return (
                <div
                  key={tag.id}
                  className={cx(
                    "rounded-xl border bg-panel p-4 transition-colors",
                    active ? "border-brand/50" : "border-line",
                  )}
                >
                  {editing ? (
                    <TagEditor
                      tag={tag}
                      onSave={(patch) => {
                        updateTag(tag.id, patch);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => {
                        deleteTag(tag.id);
                        if (selected === tag.id) setSelected(null);
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <div className="flex w-full items-center justify-between gap-3">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => setSelected(active ? null : tag.id)}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ background: tag.color }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {tag.name}
                          </span>
                          <span className="text-xs text-muted">
                            {count}{" "}
                            {plural(
                              count,
                              "movimentação",
                              "movimentações",
                            )}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <span className="block text-xs text-muted">
                            entradas {formatBRL(inflow)}
                          </span>
                          <span className="block text-xs text-muted">
                            saídas {formatBRL(outflow)}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingId(tag.id)}
                          className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
                          aria-label="Editar tag"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <h2 className="text-sm font-bold">
                {selected
                  ? `Movimentações · ${
                      state.tags.find((t) => t.id === selected)?.name ?? ""
                    }`
                  : "Selecione uma tag"}
              </h2>
              {selected && (
                <span className="text-xs text-muted">
                  {selectedTx.length}{" "}
                  {plural(selectedTx.length, "registro", "registros")}
                </span>
              )}
            </div>
            <div className="divide-y divide-line-soft">
              {!selected && (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  Escolha uma tag à esquerda para ver o cruzamento de
                  movimentações.
                </p>
              )}
              {selected && selectedTx.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  Nenhuma movimentação com esta tag.
                </p>
              )}
              {selectedTx.map((t) => {
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
                      <span className="text-xs text-muted">
                        {formatDayMonth(t.date)} · {BUCKET_LABELS[t.bucket]}
                      </span>
                    </span>
                    <span
                      className={cx(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        t.bucket === "entradas" ? "text-[#4fa03f]" : "text-ink",
                      )}
                    >
                      {t.bucket === "entradas" ? "+" : "-"}
                      {formatBRL(t.amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function TagEditor({
  tag,
  onSave,
  onCancel,
  onDelete,
}: {
  tag: Tag;
  onSave: (patch: Partial<Tag>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave({ name, color })}
        />
        <Button size="icon" onClick={() => onSave({ name, color })} aria-label="Salvar tag">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel} aria-label="Cancelar">
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="danger" onClick={onDelete} aria-label="Excluir tag">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <ColorPicker value={color} onChange={setColor} />
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cx(
            "h-7 w-7 rounded-full border-2",
            value === c ? "border-ink" : "border-transparent",
          )}
          style={{ background: c }}
          aria-label={`Cor ${c}`}
        />
      ))}
    </div>
  );
}
