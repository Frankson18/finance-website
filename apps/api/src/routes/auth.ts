import type { FastifyInstance, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { loginSchema, registerSchema } from "@fluxo/shared";
import { prisma } from "../db.js";
import { env, googleEnabled, captchaEnabled } from "../env.js";
import { AUTH_COOKIE, CSRF_COOKIE, SESSION_DAYS } from "../constants.js";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function publicUser(user: { id: string; email: string; name: string | null }) {
  return { id: user.id, email: user.email, name: user.name };
}

function setSession(reply: FastifyReply, token: string) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  reply.setCookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge,
  });
  reply.setCookie(CSRF_COOKIE, crypto.randomBytes(24).toString("hex"), {
    httpOnly: false,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge,
  });
}

function clearSession(reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE, { path: "/" });
  reply.clearCookie(CSRF_COOKIE, { path: "/" });
}

async function verifyCaptcha(token?: string): Promise<boolean> {
  if (!captchaEnabled) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({
      secret: env.captchaSecret,
      response: token,
    });
    const res = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}

async function isPwned(password: string): Promise<boolean> {
  if (!env.pwnedCheck) return false;
  try {
    const sha1 = crypto
      .createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { headers: { "Add-Padding": "true" } },
    );
    if (!res.ok) return false;
    const text = await res.text();
    return text
      .split("\n")
      .some((line) => line.split(":")[0]?.trim() === suffix);
  } catch {
    return false;
  }
}

export async function authRoutes(app: FastifyInstance) {
  const dummyHash = await bcrypt.hash("fluxo-dummy-password", 12);

  app.get("/providers", async () => ({
    google: googleEnabled,
    captcha: captchaEnabled,
  }));

  app.post(
    "/register",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: "invalid", issues: parsed.error.issues });
      }
      const { email, password, name } = parsed.data;
      const captchaToken = (request.body as { captchaToken?: string })
        ?.captchaToken;
      if (!(await verifyCaptcha(captchaToken))) {
        return reply.code(400).send({ error: "captcha" });
      }
      if (await isPwned(password)) {
        return reply.code(400).send({ error: "pwned_password" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // resposta genérica para não revelar se o e-mail existe
        return reply.code(202).send({ ok: true });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      try {
        await prisma.user.create({
          data: {
            email,
            name: name ?? null,
            passwordHash,
            settings: {
              create: {
                openingBalance: 0,
                projectionMonths: 12,
                horizonMonths: 12,
              },
            },
          },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
      // não autentica automaticamente: mantém a resposta idêntica em ambos os casos
      return reply.code(202).send({ ok: true });
    },
  );

  app.post(
    "/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid" });
      }
      const { email, password } = parsed.data;
      const captchaToken = (request.body as { captchaToken?: string })
        ?.captchaToken;
      if (!(await verifyCaptcha(captchaToken))) {
        return reply.code(400).send({ error: "captcha" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        const retryInSeconds = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 1000,
        );
        return reply.code(429).send({ error: "locked", retryInSeconds });
      }

      const ok = await bcrypt.compare(
        password,
        user?.passwordHash ?? dummyHash,
      );
      if (!user || !user.passwordHash || !ok) {
        if (user) {
          const count = user.failedLoginCount + 1;
          const lock =
            count >= MAX_FAILED
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: lock ? 0 : count,
              lockedUntil: lock,
            },
          });
        }
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      if (user.failedLoginCount || user.lockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });
      }

      const token = app.jwt.sign({ sub: user.id }, { expiresIn: "30d" });
      setSession(reply, token);
      return reply.send({ user: publicUser(user) });
    },
  );

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

  app.post("/logout", async (_request, reply) => {
    clearSession(reply);
    return reply.send({ ok: true });
  });

  app.get("/google/callback", async (request, reply) => {
    const decorator = (
      app as unknown as {
        googleOAuth2?: {
          getAccessTokenFromAuthorizationCodeFlow: (
            req: unknown,
          ) => Promise<{ token: { access_token: string } }>;
        };
      }
    ).googleOAuth2;
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
        where: { email: profile.email.toLowerCase() },
        update: { googleId: profile.sub, name: profile.name ?? undefined },
        create: {
          email: profile.email.toLowerCase(),
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
      setSession(reply, jwt);
      return reply.redirect(`${env.webUrl}/saldos`);
    } catch (err) {
      app.log.error(err);
      return reply.redirect(`${env.webUrl}/login?error=google`);
    }
  });
}
