const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(value: number): string {
  return brl.format(value ?? 0);
}

export function formatBRLCompact(value: number): string {
  if (Math.abs(value) < 10000) return brl.format(value ?? 0);
  return brlCompact.format(value ?? 0);
}

export function formatSignedBRL(value: number): string {
  const prefix = value > 0 ? "+ " : value < 0 ? "- " : "";
  return `${prefix}${brl.format(Math.abs(value))}`;
}

export function parseAmount(input: string): number {
  if (!input) return 0;
  const cleaned = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumberInput(value: number): string {
  return (value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function plural(
  count: number,
  singular: string,
  pluralForm: string,
): string {
  return count === 1 ? singular : pluralForm;
}
