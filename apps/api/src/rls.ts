import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

/**
 * Executa uma função dentro de uma transação com o contexto do usuário
 * (`app.user_id`) definido via `set_config(..., true)`. As políticas de
 * Row Level Security usam esse valor para isolar os dados por usuário.
 */
export function runAsUser<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
