"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { PublicUser } from "@fluxo/shared";
import { api, UNAUTHORIZED_EVENT } from "./api";

interface AuthValue {
  user: PublicUser | null;
  ready: boolean;
  providers: { google: boolean; captcha: boolean };
  login: (
    email: string,
    password: string,
    captchaToken?: string,
  ) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string,
    captchaToken?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [providers, setProviders] = useState({
    google: false,
    captcha: false,
  });

  useEffect(() => {
    api<{ google: boolean; captcha: boolean }>("/api/auth/providers")
      .then((p) => setProviders({ google: p.google, captcha: p.captcha }))
      .catch(() => setProviders({ google: false, captcha: false }));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await api<{ user: PublicUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      const res = await api<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: { email, password, captchaToken },
      });
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name?: string,
      captchaToken?: string,
    ) => {
      await api("/api/auth/register", {
        method: "POST",
        body: { email, password, name, captchaToken },
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, ready, providers, login, register, logout, reload }),
    [user, ready, providers, login, register, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
