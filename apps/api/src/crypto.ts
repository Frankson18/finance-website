import crypto from "node:crypto";

const PREFIX = "enc:v1:";
const rawKey = process.env.ENCRYPTION_KEY ?? "";

function key(): Buffer | null {
  if (!rawKey) return null;
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Criptografa um campo de texto com AES-256-GCM.
 * Se `ENCRYPTION_KEY` não estiver definida, retorna o texto puro (feature flag).
 */
export function encryptField(plain: string): string {
  const k = key();
  if (!k) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Descriptografa um campo. Texto sem o prefixo (legado/puro) é retornado como está. */
export function decryptField(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  const k = key();
  if (!k) return "";
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return "";
  }
}
