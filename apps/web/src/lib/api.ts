const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

const TOKEN_KEY = "fluxo.token";

export const UNAUTHORIZED_EVENT = "fluxo:unauthorized";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function googleLoginUrl(): string {
  return `${API_URL}/api/auth/google`;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("network");
  }
  if (res.status === 401) {
    clearToken();
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

export { API_URL };
