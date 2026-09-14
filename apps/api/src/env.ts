import "dotenv/config";

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-fluxo-secret-change-me",
  port: Number(process.env.PORT ?? 3333),
  apiUrl: process.env.API_URL ?? "http://localhost:3333",
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
};

export const googleEnabled =
  env.googleClientId.length > 0 && env.googleClientSecret.length > 0;
