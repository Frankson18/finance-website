import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@fluxo/shared";
import { prisma } from "../db.js";
import { env, googleEnabled } from "../env.js";

function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  return { id: user.id, email: user.email, name: user.name };
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/providers", async () => ({ google: googleEnabled }));

  app.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const { email, password, name } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: "email_exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        passwordHash,
        settings: {
          create: { openingBalance: 0, projectionMonths: 12, horizonMonths: 12 },
        },
      },
    });
    const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
    return reply.send({ token, user: publicUser(user) });
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid", issues: parsed.error.issues });
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
    return reply.send({ token, user: publicUser(user) });
  });

  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
      });
      if (!user) return reply.code(404).send({ error: "not_found" });
      return reply.send({ user: publicUser(user) });
    },
  );

  app.get("/google/callback", async (request, reply) => {
    const decorator = (app as unknown as {
      googleOAuth2?: {
        getAccessTokenFromAuthorizationCodeFlow: (
          req: unknown,
        ) => Promise<{ token: { access_token: string } }>;
      };
    }).googleOAuth2;
    if (!decorator) {
      return reply.code(501).send({ error: "google_not_configured" });
    }
    try {
      const { token } =
        await decorator.getAccessTokenFromAuthorizationCodeFlow(request);
      const infoRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${token.access_token}` } },
      );
      if (!infoRes.ok) return reply.code(401).send({ error: "google_failed" });
      const profile = (await infoRes.json()) as {
        sub: string;
        email?: string;
        name?: string;
      };
      if (!profile.email) {
        return reply.code(400).send({ error: "google_no_email" });
      }
      const user = await prisma.user.upsert({
        where: { email: profile.email },
        update: { googleId: profile.sub, name: profile.name ?? undefined },
        create: {
          email: profile.email,
          name: profile.name ?? null,
          googleId: profile.sub,
          settings: {
            create: {
              openingBalance: 0,
              projectionMonths: 12,
              horizonMonths: 12,
            },
          },
        },
      });
      const jwt = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
      return reply.redirect(`${env.webUrl}/auth/callback?token=${jwt}`);
    } catch (err) {
      app.log.error(err);
      return reply.redirect(`${env.webUrl}/login?error=google`);
    }
  });
}
