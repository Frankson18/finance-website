"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { googleLoginUrl } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";
import { GoogleIcon } from "@/components/GoogleIcon";

export default function RegisterPage() {
  const { register, user, ready, providers } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/saldos");
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim() || undefined);
      router.replace("/saldos");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "email_exists"
          ? "Esse e-mail já está cadastrado."
          : err instanceof Error && err.message === "invalid"
            ? "Verifique os dados (senha com pelo menos 6 caracteres)."
            : "Não foi possível criar a conta. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
            F
          </span>
          <span className="text-lg font-black tracking-tight">Fluxo</span>
        </div>
        <h1 className="text-xl font-bold">Criar conta</h1>
        <p className="mt-1 mb-5 text-sm text-muted">
          Comece a organizar suas finanças em poucos segundos.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </Field>
          <Field label="Senha" hint="Mínimo de 6 caracteres">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-line-soft bg-red/10 px-3 py-2 text-xs text-red">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !email || password.length < 6}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Criar conta
          </Button>
        </form>

        {providers.google && (
          <>
            <div className="my-5 flex items-center gap-3 text-[11px] text-muted">
              <span className="h-px flex-1 bg-line-soft" />
              ou
              <span className="h-px flex-1 bg-line-soft" />
            </div>

            <a
              href={googleLoginUrl()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-raised text-sm font-semibold text-ink transition-colors hover:bg-raised-2"
            >
              <GoogleIcon /> Continuar com Google
            </a>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
