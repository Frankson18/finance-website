import "dotenv/config";

const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-fluxo-secret-change-me",
  port: Number(process.env.PORT ?? 3333),
  apiUrl: process.env.API_URL ?? "http://localhost:3333",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : defaultOrigins,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  pwnedCheck: process.env.PWNED_CHECK !== "false",
  captchaSecret: process.env.CAPTCHA_SECRET ?? "",
  isProd: process.env.NODE_ENV === "production",
};

export const googleEnabled =
  env.googleClientId.length > 0 && env.googleClientSecret.length > 0;

export const captchaEnabled = env.captchaSecret.length > 0;

export function assertProductionSecrets() {
  if (!env.isProd) return;
  const weak =
    !env.jwtSecret ||
    env.jwtSecret.length < 32 ||
    env.jwtSecret.startsWith("dev-") ||
    env.jwtSecret.includes("troque");
  if (weak) {
    throw new Error(
      "JWT_SECRET fraco/ausente em produção. Defina um segredo longo e aleatório (ex.: openssl rand -base64 48).",
    );
  }
}
