import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import {
  AppState,
  Card,
  DEFAULT_SETTINGS,
  Goal,
  Settings,
  Tag,
  Transaction,
  cardInputSchema,
  goalInputSchema,
  settingsInputSchema,
  tagInputSchema,
  transactionInputSchema,
} from "@fluxo/shared";
import { decryptField, encryptField } from "../crypto.js";
import { runAsUser } from "../rls.js";

type Tx = Prisma.TransactionClient;

function serializeTx(t: {
  id: string;
  date: string;
  bucket: string;
  amount: number;
  title: string;
  description: string;
  tags: string[];
  cardId: string | null;
  goalId: string | null;
  seriesId: string | null;
  seriesKind: string | null;
  seriesIndex: number | null;
  seriesTotal: number | null;
  createdAt: Date;
}): Transaction {
  return {
    id: t.id,
    date: t.date,
    bucket: t.bucket as Transaction["bucket"],
    amount: t.amount,
    title: decryptField(t.title),
    description: decryptField(t.description),
    tags: t.tags,
    cardId: t.cardId ?? undefined,
    goalId: t.goalId ?? undefined,
    createdAt: t.createdAt.getTime(),
    seriesId: t.seriesId ?? undefined,
    seriesKind: (t.seriesKind as Transaction["seriesKind"]) ?? undefined,
    seriesIndex: t.seriesIndex ?? undefined,
    seriesTotal: t.seriesTotal ?? undefined,
  };
}

function serializeCard(c: {
  id: string;
  name: string;
  brand: string;
  limitAmount: number;
  closingDay: number;
  dueDay: number;
  color: string;
}): Card {
  return {
    id: c.id,
    name: c.name,
    brand: c.brand,
    limit: c.limitAmount,
    closingDay: c.closingDay,
    dueDay: c.dueDay,
    color: c.color,
  };
}

function serializeTag(t: { id: string; name: string; color: string }): Tag {
  return { id: t.id, name: t.name, color: t.color };
}

function serializeGoal(g: {
  id: string;
  name: string;
  target: number;
  color: string;
  createdAt: Date;
}): Goal {
  return {
    id: g.id,
    name: g.name,
    target: g.target,
    color: g.color,
    createdAt: g.createdAt.getTime(),
  };
}

function serializeSettings(
  s: {
    openingBalance: number;
    projectionMonths: number;
    horizonMonths: number;
  } | null,
): Settings {
  if (!s) return DEFAULT_SETTINGS;
  return {
    openingBalance: s.openingBalance,
    projectionMonths: s.projectionMonths,
    horizonMonths: s.horizonMonths,
  };
}

async function loadState(tx: Tx, userId: string): Promise<AppState> {
  const [transactions, cards, tags, goals, settings] = await Promise.all([
    tx.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    tx.card.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    tx.tag.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    tx.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    tx.settings.findUnique({ where: { userId } }),
  ]);
  return {
    transactions: transactions.map(serializeTx),
    cards: cards.map(serializeCard),
    tags: tags.map(serializeTag),
    goals: goals.map(serializeGoal),
    settings: serializeSettings(settings),
  };
}

const encTx = (title: string, description: string | null | undefined) => ({
  title: encryptField(title),
  description: encryptField(description ?? ""),
});

export async function dataRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/state", async (request, reply) => {
    const userId = request.user.sub;
    return reply.send(await runAsUser(userId, (tx) => loadState(tx, userId)));
  });

  app.post("/transactions", async (request, reply) => {
    const parsed = transactionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const t = await runAsUser(userId, (tx) =>
      tx.transaction.create({
        data: {
          ...parsed.data,
          ...encTx(parsed.data.title, parsed.data.description),
          userId,
          cardId: parsed.data.cardId ?? null,
          goalId: parsed.data.goalId ?? null,
          seriesId: parsed.data.seriesId ?? null,
          seriesKind: parsed.data.seriesKind ?? null,
          seriesIndex: parsed.data.seriesIndex ?? null,
          seriesTotal: parsed.data.seriesTotal ?? null,
        },
      }),
    );
    return reply.send(serializeTx(t));
  });

  app.post("/transactions/bulk", async (request, reply) => {
    const body = request.body as { items?: unknown };
    const items = Array.isArray(body?.items) ? body.items : [];
    const parsedItems = items.map((i) => transactionInputSchema.parse(i));
    const userId = request.user.sub;
    const created = await runAsUser(userId, async (tx) => {
      const results = [];
      for (const data of parsedItems) {
        results.push(
          await tx.transaction.create({
            data: {
              ...data,
              ...encTx(data.title, data.description),
              userId,
              cardId: data.cardId ?? null,
              goalId: data.goalId ?? null,
              seriesId: data.seriesId ?? null,
              seriesKind: data.seriesKind ?? null,
              seriesIndex: data.seriesIndex ?? null,
              seriesTotal: data.seriesTotal ?? null,
            },
          }),
        );
      }
      return results;
    });
    return reply.send(created.map(serializeTx));
  });

  app.patch("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = transactionInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const {
      tags,
      cardId,
      goalId,
      seriesId,
      seriesKind,
      seriesIndex,
      seriesTotal,
      title,
      description,
      ...rest
    } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (title !== undefined) data.title = encryptField(title);
    if (description !== undefined)
      data.description = encryptField(description ?? "");
    if (tags !== undefined) data.tags = tags;
    if (cardId !== undefined) data.cardId = cardId ?? null;
    if (goalId !== undefined) data.goalId = goalId ?? null;
    if (seriesId !== undefined) data.seriesId = seriesId ?? null;
    if (seriesKind !== undefined) data.seriesKind = seriesKind ?? null;
    if (seriesIndex !== undefined) data.seriesIndex = seriesIndex ?? null;
    if (seriesTotal !== undefined) data.seriesTotal = seriesTotal ?? null;

    const t = await runAsUser(userId, async (tx) => {
      await tx.transaction.updateMany({ where: { id, userId }, data });
      return tx.transaction.findFirst({ where: { id, userId } });
    });
    if (!t) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeTx(t));
  });

  app.delete("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await runAsUser(userId, (tx) =>
      tx.transaction.deleteMany({ where: { id, userId } }),
    );
    return reply.send({ ok: true });
  });

  app.post("/cards", async (request, reply) => {
    const parsed = cardInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const { limit, ...rest } = parsed.data;
    const userId = request.user.sub;
    const card = await runAsUser(userId, (tx) =>
      tx.card.create({ data: { ...rest, limitAmount: limit, userId } }),
    );
    return reply.send(serializeCard(card));
  });

  app.patch("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = cardInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const { limit, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (limit !== undefined) data.limitAmount = limit;
    const userId = request.user.sub;
    const card = await runAsUser(userId, async (tx) => {
      await tx.card.updateMany({ where: { id, userId }, data });
      return tx.card.findFirst({ where: { id, userId } });
    });
    if (!card) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeCard(card));
  });

  app.delete("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await runAsUser(userId, async (tx) => {
      await tx.transaction.updateMany({
        where: { userId, cardId: id },
        data: { cardId: null },
      });
      await tx.card.deleteMany({ where: { id, userId } });
    });
    return reply.send({ ok: true });
  });

  app.post("/tags", async (request, reply) => {
    const parsed = tagInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const tag = await runAsUser(userId, (tx) =>
      tx.tag.create({ data: { ...parsed.data, userId } }),
    );
    return reply.send(serializeTag(tag));
  });

  app.patch("/tags/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = tagInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const tag = await runAsUser(userId, async (tx) => {
      await tx.tag.updateMany({ where: { id, userId }, data: parsed.data });
      return tx.tag.findFirst({ where: { id, userId } });
    });
    if (!tag) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeTag(tag));
  });

  app.delete("/tags/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await runAsUser(userId, async (tx) => {
      const affected = await tx.transaction.findMany({
        where: { userId, tags: { has: id } },
      });
      for (const t of affected) {
        await tx.transaction.update({
          where: { id: t.id },
          data: { tags: t.tags.filter((tagId) => tagId !== id) },
        });
      }
      await tx.tag.deleteMany({ where: { id, userId } });
    });
    return reply.send({ ok: true });
  });

  app.post("/goals", async (request, reply) => {
    const parsed = goalInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const goal = await runAsUser(userId, (tx) =>
      tx.goal.create({ data: { ...parsed.data, userId } }),
    );
    return reply.send(serializeGoal(goal));
  });

  app.patch("/goals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = goalInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const goal = await runAsUser(userId, async (tx) => {
      await tx.goal.updateMany({ where: { id, userId }, data: parsed.data });
      return tx.goal.findFirst({ where: { id, userId } });
    });
    if (!goal) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeGoal(goal));
  });

  app.delete("/goals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await runAsUser(userId, async (tx) => {
      await tx.transaction.updateMany({
        where: { userId, goalId: id },
        data: { goalId: null },
      });
      await tx.goal.deleteMany({ where: { id, userId } });
    });
    return reply.send({ ok: true });
  });

  app.patch("/settings", async (request, reply) => {
    const parsed = settingsInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const settings = await runAsUser(userId, (tx) =>
      tx.settings.upsert({
        where: { userId },
        update: parsed.data,
        create: {
          userId,
          openingBalance: parsed.data.openingBalance ?? 0,
          projectionMonths: parsed.data.projectionMonths ?? 12,
          horizonMonths: parsed.data.horizonMonths ?? 12,
        },
      }),
    );
    return reply.send(serializeSettings(settings));
  });

  app.put("/import", async (request, reply) => {
    const body = request.body as Partial<AppState>;
    const userId = request.user.sub;
    const state = await runAsUser(userId, async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.card.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });

      const tags = Array.isArray(body.tags) ? body.tags : [];
      const cards = Array.isArray(body.cards) ? body.cards : [];
      const goals = Array.isArray(body.goals) ? body.goals : [];
      const transactions = Array.isArray(body.transactions)
        ? body.transactions
        : [];

      for (const t of tags) {
        await tx.tag.create({
          data: { id: t.id, userId, name: t.name, color: t.color },
        });
      }
      for (const c of cards) {
        await tx.card.create({
          data: {
            id: c.id,
            userId,
            name: c.name,
            brand: c.brand,
            limitAmount: c.limit,
            closingDay: c.closingDay,
            dueDay: c.dueDay,
            color: c.color,
          },
        });
      }
      for (const g of goals) {
        await tx.goal.create({
          data: {
            id: g.id,
            userId,
            name: g.name,
            target: g.target,
            color: g.color,
          },
        });
      }
      for (const t of transactions) {
        await tx.transaction.create({
          data: {
            id: t.id,
            userId,
            date: t.date,
            bucket: t.bucket,
            amount: t.amount,
            ...encTx(t.title ?? t.description ?? "", t.description),
            tags: t.tags,
            cardId: t.cardId ?? null,
            goalId: t.goalId ?? null,
            seriesId: t.seriesId ?? null,
            seriesKind: t.seriesKind ?? null,
            seriesIndex: t.seriesIndex ?? null,
            seriesTotal: t.seriesTotal ?? null,
          },
        });
      }
      if (body.settings) {
        await tx.settings.upsert({
          where: { userId },
          update: body.settings,
          create: { userId, ...DEFAULT_SETTINGS, ...body.settings },
        });
      }
      return loadState(tx, userId);
    });
    return reply.send(state);
  });
}
