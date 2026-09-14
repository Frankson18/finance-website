"use client";

import { createContext, useContext } from "react";
import { Bucket, Card } from "@/lib/types";

export interface TransactionPrefill {
  id?: string;
  date?: string;
  bucket?: Bucket;
  cardId?: string;
}

export interface UIContextValue {
  openTransactionDialog: (prefill?: TransactionPrefill) => void;
  closeTransactionDialog: () => void;
  openCardDialog: (card?: Card | null) => void;
  closeCardDialog: () => void;
  goToToday: () => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
