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

export type RepeatUnit = "day" | "week" | "month";

export interface RepeatConfig {
  kind: RepeatKind;
  installments: number;
  unit: RepeatUnit;
  interval: number;
  occurrences: number;
  indefinite: boolean;
}

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd
  bucket: Bucket;
  amount: number;
  title: string;
  description: string;
  tags: string[];
  cardId?: string;
  goalId?: string;
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

export interface Goal {
  id: string;
  name: string;
  target: number;
  color: string;
  createdAt: number;
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
  goals: Goal[];
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
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  tags: z.array(z.string()).default([]),
  cardId: z.string().nullish(),
  goalId: z.string().nullish(),
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

export const goalInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  target: z.number().positive(),
  color: z.string().min(1).max(40),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

export const settingsInputSchema = z.object({
  openingBalance: z.number(),
  projectionMonths: z.number().int().min(1).max(60),
  horizonMonths: z.number().int().min(1).max(60),
});
export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail")
  .email("E-mail inválido");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo de 8 caracteres")
  .max(100, "Máximo de 100 caracteres")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/[0-9]/, "Inclua ao menos um número");

export interface PasswordRule {
  key: string;
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: "Pelo menos 8 caracteres", test: (v) => v.length >= 8 },
  { key: "letter", label: "Uma letra", test: (v) => /[A-Za-z]/.test(v) },
  { key: "number", label: "Um número", test: (v) => /[0-9]/.test(v) },
];

export function passwordIsValid(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2, "Nome muito curto").max(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha").max(100),
});

export const DEFAULT_SETTINGS: Settings = {
  openingBalance: 0,
  projectionMonths: 12,
  horizonMonths: 12,
};
