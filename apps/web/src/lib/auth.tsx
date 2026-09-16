"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthResponse, PublicUser } from "@fluxo/shared";
import { api, clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from "./api";

interface AuthValue {
  user: PublicUser | null;
  ready: boolean;
  providers: { google: boolean };
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<void>;
  logout: () => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [providers, setProviders] = useState({ google: false });

  useEffect(() => {
    api<{ google: boolean }>("/api/auth/providers")
      .then((p) => setProviders(p))
      .catch(() => setProviders({ google: false }));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, []);

  const reload = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const res = await api<{ user: PublicUser }>("/api/auth/me");
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: { email, password, name },
      });
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
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
