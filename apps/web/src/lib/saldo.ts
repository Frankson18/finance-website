export interface SaldoLevel {
  color: string;
  label: string;
  range: string;
}

export const SALDO_LEVELS: SaldoLevel[] = [
  { color: "#e5484d", label: "Negativo", range: "abaixo de R$ 0" },
  { color: "#c0504d", label: "Baixo", range: "R$ 0 a R$ 1.000" },
  { color: "#4fa03f", label: "Saudável", range: "R$ 1.000 a R$ 5.000" },
  { color: "#58b846", label: "Alto", range: "acima de R$ 5.000" },
];

export function saldoLevel(value: number): SaldoLevel {
  if (value < 0) return SALDO_LEVELS[0];
  if (value < 1000) return SALDO_LEVELS[1];
  if (value < 5000) return SALDO_LEVELS[2];
  return SALDO_LEVELS[3];
}

export function saldoColor(value: number): string {
  return saldoLevel(value).color;
}
