import type { FastifyInstance } from "fastify";
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
import { prisma } from "../db.js";

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
    title: t.title,
    description: t.description,
    tags: t.tags,
    cardId: t.cardId ?? undefined,
    goalId: t.goalId ?? undefined,
    createdAt: t.createdAt.getTime(),
    seriesId: t.seriesId ?? undefined,
    seriesKind:
      (t.seriesKind as Transaction["seriesKind"]) ?? undefined,
    seriesIndex: t.seriesIndex ?? undefined,
    seriesTotal: t.seriesTotal ?? undefined,
  };
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

function serializeSettings(
  s: { openingBalance: number; projectionMonths: number; horizonMonths: number } | null,
): Settings {
  if (!s) return DEFAULT_SETTINGS;
  return {
    openingBalance: s.openingBalance,
    projectionMonths: s.projectionMonths,
    horizonMonths: s.horizonMonths,
  };
}

async function loadState(userId: string): Promise<AppState> {
  const [transactions, cards, tags, goals, settings] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.card.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.settings.findUnique({ where: { userId } }),
  ]);
  return {
    transactions: transactions.map(serializeTx),
    cards: cards.map(serializeCard),
    tags: tags.map(serializeTag),
    goals: goals.map(serializeGoal),
    settings: serializeSettings(settings),
  };
}

export async function dataRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/state", async (request, reply) => {
    return reply.send(await loadState(request.user.sub));
  });

  app.post("/transactions", async (request, reply) => {
    const parsed = transactionInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const t = await prisma.transaction.create({
      data: {
        ...parsed.data,
        userId,
        cardId: parsed.data.cardId ?? null,
        goalId: parsed.data.goalId ?? null,
        seriesId: parsed.data.seriesId ?? null,
        seriesKind: parsed.data.seriesKind ?? null,
        seriesIndex: parsed.data.seriesIndex ?? null,
        seriesTotal: parsed.data.seriesTotal ?? null,
      },
    });
    return reply.send(serializeTx(t));
  });

  app.post("/transactions/bulk", async (request, reply) => {
    const body = request.body as { items?: unknown };
    const items = Array.isArray(body?.items) ? body.items : [];
    const parsedItems = items.map((i) => transactionInputSchema.parse(i));
    const userId = request.user.sub;
    const created = await prisma.$transaction(
      parsedItems.map((data) =>
        prisma.transaction.create({
          data: {
            ...data,
            userId,
            cardId: data.cardId ?? null,
            goalId: data.goalId ?? null,
            seriesId: data.seriesId ?? null,
            seriesKind: data.seriesKind ?? null,
            seriesIndex: data.seriesIndex ?? null,
            seriesTotal: data.seriesTotal ?? null,
          },
        }),
      ),
    );
    return reply.send(created.map(serializeTx));
  });

  app.patch("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = transactionInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const { tags, cardId, goalId, seriesId, seriesKind, seriesIndex, seriesTotal, ...rest } =
      parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (tags !== undefined) data.tags = tags;
    if (cardId !== undefined) data.cardId = cardId ?? null;
    if (goalId !== undefined) data.goalId = goalId ?? null;
    if (seriesId !== undefined) data.seriesId = seriesId ?? null;
    if (seriesKind !== undefined) data.seriesKind = seriesKind ?? null;
    if (seriesIndex !== undefined) data.seriesIndex = seriesIndex ?? null;
    if (seriesTotal !== undefined) data.seriesTotal = seriesTotal ?? null;
    await prisma.transaction.updateMany({ where: { id, userId }, data });
    const t = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!t) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeTx(t));
  });

  app.delete("/transactions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.transaction.deleteMany({
      where: { id, userId: request.user.sub },
    });
    return reply.send({ ok: true });
  });

  app.post("/cards", async (request, reply) => {
    const parsed = cardInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const { limit, ...rest } = parsed.data;
    const card = await prisma.card.create({
      data: { ...rest, limitAmount: limit, userId: request.user.sub },
    });
    return reply.send(serializeCard(card));
  });

  app.patch("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = cardInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const { limit, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };
    if (limit !== undefined) data.limitAmount = limit;
    await prisma.card.updateMany({
      where: { id, userId: request.user.sub },
      data,
    });
    const card = await prisma.card.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!card) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeCard(card));
  });

  app.delete("/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await prisma.transaction.updateMany({
      where: { userId, cardId: id },
      data: { cardId: null },
    });
    await prisma.card.deleteMany({ where: { id, userId } });
    return reply.send({ ok: true });
  });

  app.post("/tags", async (request, reply) => {
    const parsed = tagInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const tag = await prisma.tag.create({
      data: { ...parsed.data, userId: request.user.sub },
    });
    return reply.send(serializeTag(tag));
  });

  app.patch("/tags/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = tagInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    await prisma.tag.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    const tag = await prisma.tag.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!tag) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeTag(tag));
  });

  app.delete("/tags/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await prisma.$executeRaw`UPDATE "Transaction" SET tags = array_remove(tags, ${id}) WHERE "userId" = ${userId}`;
    await prisma.tag.deleteMany({ where: { id, userId } });
    return reply.send({ ok: true });
  });

  app.post("/goals", async (request, reply) => {
    const parsed = goalInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const goal = await prisma.goal.create({
      data: { ...parsed.data, userId: request.user.sub },
    });
    return reply.send(serializeGoal(goal));
  });

  app.patch("/goals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = goalInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    await prisma.goal.updateMany({
      where: { id, userId: request.user.sub },
      data: parsed.data,
    });
    const goal = await prisma.goal.findFirst({
      where: { id, userId: request.user.sub },
    });
    if (!goal) return reply.code(404).send({ error: "not_found" });
    return reply.send(serializeGoal(goal));
  });

  app.delete("/goals/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.sub;
    await prisma.transaction.updateMany({
      where: { userId, goalId: id },
      data: { goalId: null },
    });
    await prisma.goal.deleteMany({ where: { id, userId } });
    return reply.send({ ok: true });
  });

  app.patch("/settings", async (request, reply) => {
    const parsed = settingsInputSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const userId = request.user.sub;
    const settings = await prisma.settings.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        openingBalance: parsed.data.openingBalance ?? 0,
        projectionMonths: parsed.data.projectionMonths ?? 12,
        horizonMonths: parsed.data.horizonMonths ?? 12,
      },
    });
    return reply.send(serializeSettings(settings));
  });

  app.put("/import", async (request, reply) => {
    const body = request.body as Partial<AppState>;
    const userId = request.user.sub;
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.card.deleteMany({ where: { userId } }),
      prisma.tag.deleteMany({ where: { userId } }),
      prisma.goal.deleteMany({ where: { userId } }),
    ]);
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const goals = Array.isArray(body.goals) ? body.goals : [];
    const transactions = Array.isArray(body.transactions) ? body.transactions : [];
    if (tags.length) {
      await prisma.tag.createMany({
        data: tags.map((t) => ({
          id: t.id,
          userId,
          name: t.name,
          color: t.color,
        })),
      });
    }
    if (cards.length) {
      await prisma.card.createMany({
        data: cards.map((c) => ({
          id: c.id,
          userId,
          name: c.name,
          brand: c.brand,
          limitAmount: c.limit,
          closingDay: c.closingDay,
          dueDay: c.dueDay,
          color: c.color,
        })),
      });
    }
    if (goals.length) {
      await prisma.goal.createMany({
        data: goals.map((g) => ({
          id: g.id,
          userId,
          name: g.name,
          target: g.target,
          color: g.color,
        })),
      });
    }
    if (transactions.length) {
      await prisma.transaction.createMany({
        data: transactions.map((t) => ({
          id: t.id,
          userId,
          date: t.date,
          bucket: t.bucket,
          amount: t.amount,
          title: t.title ?? t.description ?? "",
          description: t.description ?? "",
          tags: t.tags,
          cardId: t.cardId ?? null,
          goalId: t.goalId ?? null,
          seriesId: t.seriesId ?? null,
          seriesKind: t.seriesKind ?? null,
          seriesIndex: t.seriesIndex ?? null,
          seriesTotal: t.seriesTotal ?? null,
        })),
      });
    }
    if (body.settings) {
      await prisma.settings.upsert({
        where: { userId },
        update: body.settings,
        create: { userId, ...DEFAULT_SETTINGS, ...body.settings },
      });
    }
    return reply.send(await loadState(userId));
  });
}
