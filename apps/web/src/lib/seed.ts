import { addMonths, format, startOfMonth } from "date-fns";
import { AppState, Bucket, Card, Tag, Transaction } from "./types";

export const TAG_COLORS = [
  "#3b82f6",
  "#a855f7",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#eab308",
];

export const CARD_COLORS = [
  "#8a05be",
  "#ff7a00",
  "#ec7000",
  "#00a5f4",
  "#111827",
  "#0f766e",
];

export function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function dateIn(month: Date, day: number): string {
  return format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd");
}

export function seedState(): AppState {
  const today = new Date();
  const thisMonth = startOfMonth(today);
  const lastMonth = startOfMonth(addMonths(today, -1));

  const cards: Card[] = [
    {
      id: "card_nubank",
      name: "Nubank",
      brand: "Mastercard",
      limit: 8000,
      closingDay: 28,
      dueDay: 5,
      color: "#8a05be",
    },
    {
      id: "card_inter",
      name: "Inter",
      brand: "Visa",
      limit: 5000,
      closingDay: 25,
      dueDay: 1,
      color: "#ff7a00",
    },
    {
      id: "card_itau",
      name: "Itaú",
      brand: "Visa",
      limit: 12000,
      closingDay: 20,
      dueDay: 27,
      color: "#ec7000",
    },
  ];

  const tags: Tag[] = [
    { id: "tag_essencial", name: "essencial", color: "#3b82f6" },
    { id: "tag_casa", name: "casa", color: "#22c55e" },
    { id: "tag_lazer", name: "lazer", color: "#a855f7" },
    { id: "tag_assinatura", name: "assinaturas", color: "#f59e0b" },
    { id: "tag_saude", name: "saúde", color: "#ef4444" },
    { id: "tag_trabalho", name: "trabalho", color: "#14b8a6" },
  ];

  let seq = 0;
  const mk = (
    month: Date,
    day: number,
    bucket: Bucket,
    amount: number,
    description: string,
    tagIds: string[],
    cardId?: string,
  ): Transaction => ({
    id: `tx_seed_${seq++}`,
    date: dateIn(month, day),
    bucket,
    amount,
    description,
    tags: tagIds,
    cardId,
    createdAt: Date.now() - seq * 1000,
  });

  const transactions: Transaction[] = [];

  for (const month of [lastMonth, thisMonth]) {
    const isCurrent = month.getTime() === thisMonth.getTime();
    transactions.push(
      mk(month, 5, "entradas", 5200, "Salário", ["tag_trabalho"]),
      mk(month, 18, "entradas", 1350, "Freelance", ["tag_trabalho"]),
      mk(month, 10, "saidas", 1500, "Aluguel", ["tag_casa"]),
      mk(month, 12, "saidas", 182.4, "Energia elétrica", ["tag_casa"]),
      mk(month, 15, "saidas", 119.9, "Internet", ["tag_assinatura"]),
      mk(month, 22, "saidas", 340, "Supermercado", ["tag_essencial"]),
      mk(month, 6, "economias", 1000, "Reserva de emergência", []),
      mk(month, 20, "diarios", 45.8, "Almoço", ["tag_essencial"]),
      mk(month, 24, "diarios", 62.5, "Farmácia", ["tag_saude"]),
      mk(month, 27, "diarios", 88, "Uber", ["tag_essencial"]),
      mk(month, 28, "cartao", 154.35, "Streaming + apps", ["tag_assinatura"], "card_nubank"),
      mk(month, 14, "cartao", 289.9, "Jantar fora", ["tag_lazer"], "card_inter"),
      mk(month, 8, "cartao", 520, "Passagens", ["tag_lazer"], "card_itau"),
    );

    if (isCurrent) {
      transactions.push(
        mk(month, 2, "saidas", 210.75, "Mercado", ["tag_essencial"]),
        mk(month, 3, "diarios", 32, "Café", ["tag_essencial"]),
        mk(month, 4, "diarios", 54.9, "Almoço", ["tag_essencial"]),
        mk(month, 7, "cartao", 89.9, "Assinatura anual", ["tag_assinatura"], "card_nubank"),
        mk(month, 9, "saidas", 96.3, "Petshop", ["tag_casa"]),
        mk(month, 11, "saidas", 64.2, "Combustível", ["tag_essencial"]),
      );
    }
  }

  const seriesStart = lastMonth;
  const notebookTotal = 3600;
  const parcelas = 6;
  const per = Math.round((notebookTotal / parcelas) * 100) / 100;
  for (let i = 0; i < parcelas; i++) {
    transactions.push({
      id: `tx_seed_nb_${i}`,
      date: dateIn(addMonths(seriesStart, i), 9),
      bucket: "cartao",
      amount:
        i === parcelas - 1
          ? Math.round((notebookTotal - per * (parcelas - 1)) * 100) / 100
          : per,
      description: "Notebook",
      tags: ["tag_trabalho"],
      cardId: "card_itau",
      createdAt: Date.now() - (300 + i) * 1000,
      seriesId: "ser_notebook",
      seriesKind: "installment",
      seriesIndex: i + 1,
      seriesTotal: parcelas,
    });
  }

  for (let i = 0; i < 6; i++) {
    transactions.push({
      id: `tx_seed_vale_${i}`,
      date: dateIn(addMonths(lastMonth, i), 1),
      bucket: "entradas",
      amount: 800,
      description: "Vale alimentação",
      tags: ["tag_essencial"],
      createdAt: Date.now() - (400 + i) * 1000,
      seriesId: "ser_vale",
      seriesKind: "recurring",
      seriesIndex: i + 1,
      seriesTotal: 6,
    });
  }

  return {
    transactions,
    cards,
    tags,
    settings: {
      openingBalance: 5000,
      projectionMonths: 12,
      horizonMonths: 12,
    },
  };
}
