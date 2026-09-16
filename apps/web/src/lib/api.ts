const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const UNAUTHORIZED_EVENT = "fluxo:unauthorized";

const CSRF_COOKIE = "fluxo_csrf";
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (MUTATING.includes(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("network");
  }
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(
      (payload as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

export function googleLoginUrl(): string {
  return `${API_URL}/api/auth/google`;
}

export { API_URL };
