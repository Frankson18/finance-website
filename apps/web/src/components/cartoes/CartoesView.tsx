"use client";

import { useMemo, useState } from "react";
import { addMonths } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "@/lib/types";
import { formatBRL } from "@/lib/format";
import {
  formatFullDate,
  formatMonthLong,
  formatMonthShort,
  todayISO,
} from "@/lib/date";
import {
  cardInvoice,
  CardInvoice,
  cardUsed,
  nextInvoiceReference,
} from "@/lib/calc";
import { seriesLabel } from "@/lib/recurrence";
import { PageBody, PageHeader } from "../PageHeader";
import { Button, EmptyState, Modal, Progress } from "../ui";
import { useUI } from "../ui-context";

export function CartoesView() {
  const { state } = useStore();
  const { openCardDialog, openTransactionDialog } = useUI();
  const [selected, setSelected] = useState<Card | null>(null);

  const cards = state.cards;

  return (
    <>
      <PageHeader title="cartões" subtitle={`${cards.length} cartões`}>
        <Button size="sm" onClick={() => openCardDialog(null)}>
          <Plus className="h-4 w-4" /> novo cartão
        </Button>
      </PageHeader>

      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto w-full max-w-6xl">
          {cards.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title="Nenhum cartão cadastrado"
              description="Cadastre seus cartões para acompanhar faturas, limite e compras."
              action={
                <Button size="sm" onClick={() => openCardDialog(null)}>
                  <Plus className="h-4 w-4" /> cadastrar cartão
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  onOpen={() => setSelected(card)}
                  onAdd={() =>
                    openTransactionDialog({
                      bucket: "cartao",
                      cardId: card.id,
                    })
                  }
                  onEdit={() => openCardDialog(card)}
                />
              ))}
            </div>
          )}
        </div>
      </PageBody>

      {selected && (
        <InvoiceModal
          card={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            openCardDialog(selected);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}

function CardTile({
  card,
  onOpen,
  onAdd,
  onEdit,
}: {
  card: Card;
  onOpen: () => void;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const { state } = useStore();
  const used = cardUsed(state.transactions, card.id);
  const available = Math.max(0, card.limit - used);
  const invoice = cardInvoice(
    state.transactions,
    card,
    nextInvoiceReference(card),
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4">
      <button onClick={onOpen} className="text-left">
        <div
          className="relative flex h-40 flex-col justify-between overflow-hidden rounded-xl p-4 text-white"
          style={{
            background: `linear-gradient(135deg, ${card.color} 0%, #12141a 140%)`,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80">{card.brand}</p>
              <p className="text-lg font-bold">{card.name}</p>
            </div>
            <CreditCard className="h-5 w-5 opacity-80" />
          </div>
          <div>
            <p className="text-[11px] opacity-70 uppercase">Fatura atual</p>
            <p className="text-xl font-bold tabular-nums">
              {formatBRL(invoice.total)}
            </p>
            <p className="mt-0.5 text-[11px] opacity-70">
              fecha {formatMonthShort(new Date(`${invoice.closing}T00:00:00`))}{" "}
              · vence {formatMonthShort(new Date(`${invoice.due}T00:00:00`))}
            </p>
          </div>
        </div>
      </button>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            Limite disponível{" "}
            <span className="font-bold text-ink">{formatBRL(available)}</span>
          </span>
          <span className="text-muted">de {formatBRL(card.limit)}</span>
        </div>
        <Progress value={(used / (card.limit || 1)) * 100} color={card.color} />
        <p className="text-[11px] text-muted">
          {((used / (card.limit || 1)) * 100).toFixed(0)}% do limite utilizado
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={onAdd}>
          <Plus className="h-4 w-4" /> compra
        </Button>
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Fatura
        </Button>
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function InvoiceModal({
  card,
  onClose,
  onEdit,
}: {
  card: Card;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { state, deleteTransaction } = useStore();
  const { openTransactionDialog } = useUI();
  const [reference, setReference] = useState(() => nextInvoiceReference(card));

  const invoice: CardInvoice = useMemo(
    () => cardInvoice(state.transactions, card, reference),
    [state.transactions, card, reference],
  );

  const used = cardUsed(state.transactions, card.id);
  const available = Math.max(0, card.limit - used);
  const isCurrent =
    reference.getTime() === nextInvoiceReference(card).getTime();

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${card.name} · ${card.brand}`}
      description={`Limite disponível ${formatBRL(available)} de ${formatBRL(
        card.limit,
      )}`}
      footer={
        <>
          <Button
            variant="secondary"
            className="mr-auto"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" /> Editar cartão
          </Button>
          <Button
            onClick={() =>
              openTransactionDialog({
                bucket: "cartao",
                cardId: card.id,
                date: todayISO(),
              })
            }
          >
            <Plus className="h-4 w-4" /> adicionar compra
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-line-soft bg-raised/40 px-3 py-2">
          <button
            onClick={() => setReference((r) => addMonths(r, -1))}
            className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
            aria-label="Fatura anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted">
              {isCurrent ? "Fatura atual" : "Fatura"}
            </p>
            <p className="text-sm font-bold first-letter:uppercase">
              {formatMonthLong(reference)}
            </p>
            <p className="text-[11px] text-muted">
              fecha {formatFullDate(invoice.closing)} · vence{" "}
              {formatFullDate(invoice.due)}
            </p>
          </div>
          <button
            onClick={() => setReference((r) => addMonths(r, 1))}
            className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
            aria-label="Próxima fatura"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line bg-raised/30 px-4 py-3">
          <span className="text-sm font-semibold text-muted">
            Total da fatura
          </span>
          <span className="text-lg font-bold tabular-nums">
            {formatBRL(invoice.total)}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-line-soft">
          {invoice.items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              Nenhuma compra nesta fatura.
            </p>
          )}
          {invoice.items.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3">
              <button
                onClick={() => openTransactionDialog({ id: t.id })}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm">{t.description}</p>
                <p className="text-xs text-muted">
                  {[
                    formatFullDate(t.date),
                    seriesLabel(t),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatBRL(t.amount)}
              </span>
              <button
                onClick={() => deleteTransaction(t.id)}
                className="shrink-0 rounded-lg p-2 text-muted hover:bg-red/15 hover:text-red"
                aria-label="Excluir compra"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
