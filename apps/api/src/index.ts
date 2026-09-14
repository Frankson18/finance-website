import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env, googleEnabled } from "./env.js";
import { prisma } from "./db.js";
import { authRoutes } from "./routes/auth.js";
import { dataRoutes } from "./routes/data.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
});

await app.register(jwt, { secret: env.jwtSecret });

app.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
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
    callbackUri: `${env.apiUrl}/api/auth/google/callback`,
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
