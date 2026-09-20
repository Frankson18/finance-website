import bcrypt from "bcryptjs";
import {
  Algorithm,
  hash as argonHash,
  verify as argonVerify,
} from "@node-rs/argon2";

// Parâmetros recomendados (OWASP) para Argon2id.
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON_OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    return argonVerify(hash, password).catch(() => false);
  }
  // Hashes legados (bcrypt)
  return bcrypt.compare(password, hash);
}

export function needsRehash(hash: string): boolean {
  return !hash.startsWith("$argon2");
}
