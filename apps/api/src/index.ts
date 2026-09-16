import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { assertProductionSecrets, env, googleEnabled } from "./env.js";
import { prisma } from "./db.js";
import { AUTH_COOKIE, CSRF_COOKIE } from "./constants.js";
import { authRoutes } from "./routes/auth.js";
import { dataRoutes } from "./routes/data.js";

assertProductionSecrets();

const app = Fastify({ logger: true, forceCloseConnections: true });

await app.register(cors, {
  origin: true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});

await app.register(cookie);
await app.register(jwt, { secret: env.jwtSecret });
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute",
});

app.decorate("authenticate", async function (request, reply) {
  let payload: { sub: string } | null = null;
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      payload = app.jwt.verify(authHeader.slice(7)) as { sub: string };
    } catch {
      payload = null;
    }
  }
  const cookieToken = request.cookies?.[AUTH_COOKIE];
  if (!payload && cookieToken) {
    try {
      payload = app.jwt.verify(cookieToken) as { sub: string };
    } catch {
      payload = null;
    }
  }
  if (!payload) return reply.code(401).send({ error: "unauthorized" });
  request.user = payload;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const header = request.headers["x-csrf-token"];
    const csrf = request.cookies?.[CSRF_COOKIE];
    if (!csrf || !header || header !== csrf) {
      return reply.code(403).send({ error: "csrf" });
    }
  }
});

if (googleEnabled) {
  const { default: oauth2 } = await import("@fastify/oauth2");
  await app.register(oauth2, {
    name: "googleOAuth2",
    credentials: {
      client: { id: env.googleClientId, secret: env.googleClientSecret },
      auth: {
        authorizeHost: "https://accounts.google.com",
        authorizePath: "/o/oauth2/v2/auth",
        tokenHost: "https://www.googleapis.com",
        tokenPath: "/oauth2/v4/token",
      },
    },
    startRedirectPath: "/api/auth/google",
    callbackUri: `${env.webUrl}/api/auth/google/callback`,
    scope: ["profile", "email"],
  });
} else {
  app.get("/api/auth/google", (_request, reply) =>
    reply.code(501).send({ error: "google_not_configured" }),
  );
}

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(dataRoutes, { prefix: "/api" });

app.get("/health", () => ({ ok: true }));

const shutdown = async (signal: string) => {
  app.log.info(`received ${signal}, shutting down`);
  const timer = setTimeout(() => process.exit(1), 2000);
  timer.unref();
  try {
    await app.close();
  } catch {
    /* ignore */
  }
  try {
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
