"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { setToken } from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { reload } = useAuth();
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setError(true);
      return;
    }
    setToken(token);
    void reload().then(() => router.replace("/saldos"));
  }, [reload, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-muted">
      {error ? (
        <>
          <p className="text-sm text-red">Não foi possível autenticar.</p>
          <a href="/login" className="text-sm font-semibold text-brand">
            Voltar para o login
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-sm">Entrando…</p>
        </>
      )}
    </div>
  );
}
