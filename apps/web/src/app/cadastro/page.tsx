"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import {
  emailSchema,
  passwordIsValid,
  PASSWORD_RULES,
} from "@fluxo/shared";
import { useAuth } from "@/lib/auth";
import { googleLoginUrl } from "@/lib/api";
import { Button, Field, Input, cx } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";
import { Captcha } from "@/components/Captcha";
import { GoogleIcon } from "@/components/GoogleIcon";

export default function RegisterPage() {
  const { register, user, ready, providers } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = emailSchema.safeParse(email).success;
  const passwordValid = passwordIsValid(password);
  const nameValid = name.trim().length === 0 || name.trim().length >= 2;
  const confirmValid = confirm.length > 0 && confirm === password;
  const canSubmit =
    emailValid && passwordValid && confirmValid && nameValid && !loading;

  const rules = PASSWORD_RULES.map((r) => ({
    ...r,
    ok: r.test(password),
  }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await register(
        email.trim(),
        password,
        name.trim() || undefined,
        captchaToken || undefined,
      );
      router.replace("/login?created=1");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg === "pwned_password"
          ? "Essa senha apareceu em vazamentos de dados. Escolha outra."
          : msg === "captcha"
            ? "Confirme o captcha para continuar."
            : msg === "invalid"
              ? "Verifique os dados informados."
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
          <Field label="Nome" hint="Opcional">
            <Input
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </Field>
          <Field
            label="E-mail"
            hint={
              email.length > 0 && !emailValid ? "Formato inválido" : undefined
            }
          >
            <Input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className={cx(
                email.length > 0 && !emailValid && "border-red/60",
              )}
            />
          </Field>

          <Field label="Senha">
            <PasswordInput
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          <ul className="flex flex-col gap-1">
            {rules.map((r) => (
              <li
                key={r.key}
                className={cx(
                  "flex items-center gap-1.5 text-xs",
                  r.ok ? "text-[#4fa03f]" : "text-muted",
                )}
              >
                {r.ok ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {r.label}
              </li>
            ))}
          </ul>

          <Field
            label="Repetir senha"
            hint={
              confirm.length > 0 && !confirmValid
                ? "As senhas não conferem"
                : undefined
            }
          >
            <PasswordInput
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={cx(
                confirm.length > 0 && !confirmValid && "border-red/60",
              )}
            />
          </Field>

          {providers.captcha && <Captcha onToken={setCaptchaToken} />}

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-line-soft bg-red/10 px-3 py-2 text-xs text-red">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit}>
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
