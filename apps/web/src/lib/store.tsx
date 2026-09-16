"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AppState,
  Card,
  Goal,
  Settings,
  Tag,
  Transaction,
} from "@fluxo/shared";
import { api } from "./api";
import { useAuth } from "./auth";
import { makeId, seedState } from "./seed";

const EMPTY: AppState = {
  transactions: [],
  cards: [],
  tags: [],
  goals: [],
  settings: { openingBalance: 0, projectionMonths: 12, horizonMonths: 12 },
};

interface StoreValue {
  ready: boolean;
  state: AppState;
  syncError: string | null;
  addTransaction: (input: Omit<Transaction, "id" | "createdAt">) => Transaction;
  addTransactions: (
    inputs: Omit<Transaction, "id" | "createdAt">[],
  ) => Transaction[];
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCard: (input: Omit<Card, "id">) => Card;
  updateCard: (id: string, patch: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  addTag: (name: string, color: string) => Tag;
  updateTag: (id: string, patch: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addGoal: (input: Omit<Goal, "id" | "createdAt">) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
  importState: (next: AppState) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [state, setState] = useState<AppState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setState(EMPTY);
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    api<AppState>("/api/state")
      .then((data) => {
        if (!active) return;
        setState(data);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setState(EMPTY);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user, authReady]);

  const fire = useCallback((path: string, method: string, body?: unknown) => {
    const run = (attempt: number) => {
      api(path, { method, body }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "erro";
        if (message === "unauthorized") return;
        if (message === "network" && attempt < 3) {
          window.setTimeout(() => run(attempt + 1), 1200);
          return;
        }
        console.error("[fluxo] api error", path, message);
        setSyncError(
          "Não foi possível salvar — tentaremos de novo ao recarregar.",
        );
        window.setTimeout(() => setSyncError(null), 5000);
      });
    };
    run(0);
  }, []);

  const addTransaction = useCallback<StoreValue["addTransaction"]>(
    (input) => {
      const tx: Transaction = { ...input, id: makeId("tx"), createdAt: Date.now() };
      setState((s) => ({ ...s, transactions: [tx, ...s.transactions] }));
      fire("/api/transactions", "POST", tx);
      return tx;
    },
    [fire],
  );

  const addTransactions = useCallback<StoreValue["addTransactions"]>(
    (inputs) => {
      const txs: Transaction[] = inputs.map((input) => ({
        ...input,
        id: makeId("tx"),
        createdAt: Date.now(),
      }));
      setState((s) => ({ ...s, transactions: [...txs, ...s.transactions] }));
      fire("/api/transactions/bulk", "POST", { items: txs });
      return txs;
    },
    [fire],
  );

  const updateTransaction = useCallback<StoreValue["updateTransaction"]>(
    (id, patch) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      }));
      fire(`/api/transactions/${id}`, "PATCH", patch);
    },
    [fire],
  );

  const deleteTransaction = useCallback<StoreValue["deleteTransaction"]>(
    (id) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.filter((t) => t.id !== id),
      }));
      fire(`/api/transactions/${id}`, "DELETE");
    },
    [fire],
  );

  const addCard = useCallback<StoreValue["addCard"]>(
    (input) => {
      const card: Card = { ...input, id: makeId("card") };
      setState((s) => ({ ...s, cards: [...s.cards, card] }));
      fire("/api/cards", "POST", card);
      return card;
    },
    [fire],
  );

  const updateCard = useCallback<StoreValue["updateCard"]>(
    (id, patch) => {
      setState((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
      fire(`/api/cards/${id}`, "PATCH", patch);
    },
    [fire],
  );

  const deleteCard = useCallback<StoreValue["deleteCard"]>(
    (id) => {
      setState((s) => ({
        ...s,
        cards: s.cards.filter((c) => c.id !== id),
        transactions: s.transactions.map((t) =>
          t.cardId === id ? { ...t, cardId: undefined } : t,
        ),
      }));
      fire(`/api/cards/${id}`, "DELETE");
    },
    [fire],
  );

  const addTag = useCallback<StoreValue["addTag"]>(
    (name, color) => {
      const tag: Tag = { id: makeId("tag"), name: name.trim(), color };
      setState((s) => ({ ...s, tags: [...s.tags, tag] }));
      fire("/api/tags", "POST", tag);
      return tag;
    },
    [fire],
  );

  const updateTag = useCallback<StoreValue["updateTag"]>(
    (id, patch) => {
      setState((s) => ({
        ...s,
        tags: s.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      fire(`/api/tags/${id}`, "PATCH", patch);
    },
    [fire],
  );

  const deleteTag = useCallback<StoreValue["deleteTag"]>(
    (id) => {
      setState((s) => ({
        ...s,
        tags: s.tags.filter((t) => t.id !== id),
        transactions: s.transactions.map((t) => ({
          ...t,
          tags: t.tags.filter((tagId) => tagId !== id),
        })),
      }));
      fire(`/api/tags/${id}`, "DELETE");
    },
    [fire],
  );

  const addGoal = useCallback<StoreValue["addGoal"]>(
    (input) => {
      const goal: Goal = { ...input, id: makeId("goal"), createdAt: Date.now() };
      setState((s) => ({ ...s, goals: [...s.goals, goal] }));
      fire("/api/goals", "POST", goal);
      return goal;
    },
    [fire],
  );

  const updateGoal = useCallback<StoreValue["updateGoal"]>(
    (id, patch) => {
      setState((s) => ({
        ...s,
        goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      }));
      fire(`/api/goals/${id}`, "PATCH", patch);
    },
    [fire],
  );

  const deleteGoal = useCallback<StoreValue["deleteGoal"]>(
    (id) => {
      setState((s) => ({
        ...s,
        goals: s.goals.filter((g) => g.id !== id),
        transactions: s.transactions.map((t) =>
          t.goalId === id ? { ...t, goalId: undefined } : t,
        ),
      }));
      fire(`/api/goals/${id}`, "DELETE");
    },
    [fire],
  );

  const updateSettings = useCallback<StoreValue["updateSettings"]>(
    (patch) => {
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      fire("/api/settings", "PATCH", patch);
    },
    [fire],
  );

  const importState = useCallback<StoreValue["importState"]>(
    (next) => {
      setState(next);
      void api<AppState>("/api/import", { method: "PUT", body: next })
        .then((data) => setState(data))
        .catch((err) => console.error("[fluxo] import error", err));
    },
    [],
  );

  const reset = useCallback(() => {
    importState(seedState());
  }, [importState]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      state,
      syncError,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addCard,
      updateCard,
      deleteCard,
      addTag,
      updateTag,
      deleteTag,
      addGoal,
      updateGoal,
      deleteGoal,
      updateSettings,
      reset,
      importState,
    }),
    [
      ready,
      state,
      syncError,
      addTransaction,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      addCard,
      updateCard,
      deleteCard,
      addTag,
      updateTag,
      deleteTag,
      addGoal,
      updateGoal,
      deleteGoal,
      updateSettings,
      reset,
      importState,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
