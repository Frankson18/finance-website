import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PiggyBank,
  Repeat,
  type LucideIcon,
} from "lucide-react";
import { Bucket } from "./types";

export const BUCKET_COLORS: Record<Bucket, string> = {
  entradas: "#4fa03f",
  saidas: "#e5484d",
  diarios: "#f59e0b",
  economias: "#14b8a6",
  cartao: "#a855f7",
};

export const BUCKET_ICONS: Record<Bucket, LucideIcon> = {
  entradas: ArrowDownLeft,
  saidas: ArrowUpRight,
  diarios: Repeat,
  economias: PiggyBank,
  cartao: CreditCard,
};

export const BUCKET_ORDER: Bucket[] = [
  "entradas",
  "saidas",
  "diarios",
  "economias",
  "cartao",
];

export const CARD_GRADIENTS = [
  "linear-gradient(135deg, #8a05be 0%, #4a0370 100%)",
  "linear-gradient(135deg, #ff7a00 0%, #b34700 100%)",
  "linear-gradient(135deg, #00a5f4 0%, #005f8c 100%)",
  "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
  "linear-gradient(135deg, #374151 0%, #111827 100%)",
  "linear-gradient(135deg, #ec7000 0%, #8a3b00 100%)",
];
