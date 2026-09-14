"use client";

import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "@/lib/types";
import { CARD_COLORS } from "@/lib/seed";
import { Button, Field, Input, Modal, Select, cx } from "./ui";
import { MoneyInput } from "./MoneyInput";

interface FormState {
  id?: string;
  name: string;
  brand: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

const EMPTY: FormState = {
  name: "",
  brand: "Visa",
  limit: 0,
  closingDay: 28,
  dueDay: 5,
  color: CARD_COLORS[0],
};

export function CardDialog({
  open,
  card,
  onClose,
}: {
  open: boolean;
  card?: Card | null;
  onClose: () => void;
}) {
  const { addCard, updateCard, deleteCard } = useStore();
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (card) {
      setForm({
        id: card.id,
        name: card.name,
        brand: card.brand,
        limit: card.limit,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, card]);

  const valid = form.name.trim().length > 0 && form.limit > 0;

  function submit() {
    if (!valid) return;
    const payload = {
      name: form.name.trim(),
      brand: form.brand,
      limit: form.limit,
      closingDay: form.closingDay,
      dueDay: form.dueDay,
      color: form.color,
    };
    if (form.id) updateCard(form.id, payload);
    else addCard(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? "Editar cartão" : "Novo cartão"}
      footer={
        <>
          {form.id && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                deleteCard(form.id!);
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
        <Field label="Nome do cartão">
          <Input
            autoFocus
            value={form.name}
            placeholder="Ex.: Nubank, Inter, Itaú"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bandeira">
            <Select
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            >
              {["Visa", "Mastercard", "Elo", "American Express", "Hipercard"].map(
                (b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Limite">
            <MoneyInput
              value={form.limit}
              onChange={(limit) => setForm((f) => ({ ...f, limit }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dia de fechamento">
            <Input
              type="number"
              min={1}
              max={31}
              value={form.closingDay}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  closingDay: Number(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Dia de vencimento">
            <Input
              type="number"
              min={1}
              max={31}
              value={form.dueDay}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDay: Number(e.target.value) }))
              }
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            Cor
          </span>
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setForm((f) => ({ ...f, color }))}
                className={cx(
                  "h-8 w-8 rounded-full border-2 transition-transform",
                  form.color === color
                    ? "scale-110 border-ink"
                    : "border-transparent",
                )}
                style={{ background: color }}
                aria-label={`Cor ${color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
