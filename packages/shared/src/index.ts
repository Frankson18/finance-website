import { z } from "zod";

export const BUCKETS = [
  "entradas",
  "saidas",
  "diarios",
  "economias",
  "cartao",
] as const;

export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_LABELS: Record<Bucket, string> = {
  entradas: "entradas",
  saidas: "saídas",
  diarios: "diários",
  economias: "economias",
  cartao: "cartão",
};

export type RepeatKind = "none" | "installment" | "recurring";

export interface RepeatConfig {
  kind: RepeatKind;
  installments: number;
  intervalMonths: number;
  months: number;
  indefinite: boolean;
}

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  bucket: Bucket;
  amount: number;
  description: string;
  tags: string[];
  cardId?: string;
  createdAt: number;
  seriesId?: string;
  seriesKind?: "installment" | "recurring";
  seriesIndex?: number;
  seriesTotal?: number;
}

export interface Card {
  id: string;
  name: string;
  brand: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Settings {
  openingBalance: number;
  projectionMonths: number;
  horizonMonths: number;
}

export interface AppState {
  transactions: Transaction[];
  cards: Card[];
  tags: Tag[];
  settings: Settings;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export const bucketSchema = z.enum(BUCKETS);

export const transactionInputSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bucket: bucketSchema,
  amount: z.number().positive(),
  description: z.string().min(1).max(200),
  tags: z.array(z.string()).default([]),
  cardId: z.string().nullish(),
  seriesId: z.string().nullish(),
  seriesKind: z.enum(["installment", "recurring"]).nullish(),
  seriesIndex: z.number().int().nullish(),
  seriesTotal: z.number().int().nullish(),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

export const cardInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  brand: z.string().min(1).max(40),
  limit: z.number().nonnegative(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  color: z.string().min(1).max(40),
});
export type CardInput = z.infer<typeof cardInputSchema>;

export const tagInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
});
export type TagInput = z.infer<typeof tagInputSchema>;

export const settingsInputSchema = z.object({
  openingBalance: z.number(),
  projectionMonths: z.number().int().min(1).max(60),
  horizonMonths: z.number().int().min(1).max(60),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(100),
});

export const DEFAULT_SETTINGS: Settings = {
  openingBalance: 0,
  projectionMonths: 12,
  horizonMonths: 12,
};
