"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/lib/types";
import { TransactionDialog } from "./TransactionDialog";
import { CardDialog } from "./CardDialog";
import {
  TransactionPrefill,
  UIContext,
  UIContextValue,
} from "./ui-context";

export function UIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [txOpen, setTxOpen] = useState(false);
  const [txPrefill, setTxPrefill] = useState<TransactionPrefill | undefined>();
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const openTransactionDialog = useCallback(
    (prefill?: TransactionPrefill) => {
      setTxPrefill(prefill);
      setTxOpen(true);
    },
    [],
  );

  const closeTransactionDialog = useCallback(() => setTxOpen(false), []);

  const openCardDialog = useCallback((card?: Card | null) => {
    setEditingCard(card ?? null);
    setCardOpen(true);
  }, []);

  const closeCardDialog = useCallback(() => setCardOpen(false), []);

  const goToToday = useCallback(() => {
    router.push("/saldos");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("fluxo:today"));
    }, 60);
  }, [router]);

  const value = useMemo<UIContextValue>(
    () => ({
      openTransactionDialog,
      closeTransactionDialog,
      openCardDialog,
      closeCardDialog,
      goToToday,
    }),
    [
      openTransactionDialog,
      closeTransactionDialog,
      openCardDialog,
      closeCardDialog,
      goToToday,
    ],
  );

  return (
    <UIContext.Provider value={value}>
      {children}
      <TransactionDialog open={txOpen} prefill={txPrefill} onClose={closeTransactionDialog} />
      <CardDialog open={cardOpen} card={editingCard} onClose={closeCardDialog} />
    </UIContext.Provider>
  );
}
