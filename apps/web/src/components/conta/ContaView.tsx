"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Database,
  Download,
  LogOut,
  RotateCcw,
  Shield,
  Upload,
} from "lucide-react";
import { passwordIsValid, PASSWORD_RULES } from "@fluxo/shared";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AppState } from "@/lib/types";
import { plural } from "@/lib/format";
import { Button, Field, Input, cx } from "../ui";
import { MoneyInput } from "../MoneyInput";
import { PasswordInput } from "../PasswordInput";
import { ThemeToggle } from "../ThemeToggle";
import { PageBody, PageHeader } from "../PageHeader";

export function ContaView() {
  const { state, updateSettings, reset, importState } = useStore();
  const { user, logout } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-financas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Dados exportados com sucesso.");
  }

  function onImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        importState(parsed);
        setMessage("Dados importados com sucesso.");
      } catch {
        setMessage("Arquivo inválido. Selecione um JSON exportado pelo Fluxo.");
      }
    };
    reader.readAsText(file);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="conta" subtitle="Sua conta e preferências" />
      <PageBody className="p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
          <section className="flex items-center gap-4 rounded-xl border border-line bg-panel p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-black text-white">
              {(user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {user?.name?.trim() || "Sem nome"}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-bold">Aparência</h2>
            <p className="mt-1 mb-4 text-xs text-muted">
              Escolha o tema da interface. “Sistema” segue a preferência do seu
              dispositivo.
            </p>
            <ThemeToggle />
          </section>

          <PasswordCard />

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-bold">Saldo inicial</h2>
            <p className="mt-1 mb-4 text-xs text-muted">
              Valor que existia na sua conta antes do primeiro lançamento. Base
              de todo o cálculo de saldos.
            </p>
            <div className="max-w-xs">
              <Field label="Saldo inicial">
                <MoneyInput
                  value={state.settings.openingBalance}
                  onChange={(openingBalance) =>
                    updateSettings({ openingBalance })
                  }
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-bold">Horizonte</h2>
            <p className="mt-1 mb-4 text-xs text-muted">
              Quantos meses a projeção de saldo futuro deve cobrir.
            </p>
            <div className="max-w-xs">
              <Field label="Meses projetados">
                <Input
                  type="number"
                  min={1}
                  max={36}
                  value={state.settings.horizonMonths}
                  onChange={(e) =>
                    updateSettings({
                      horizonMonths: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </Field>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Database className="h-4 w-4 text-brand" /> Dados
            </h2>
            <p className="mt-1 mb-4 text-xs text-muted">
              Seus dados ficam salvos na sua conta. Exporte para backup ou
              importe de outro dispositivo.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportData}>
                <Download className="h-4 w-4" /> Exportar JSON
              </Button>
              <Button
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Importar JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="danger"
                onClick={() => {
                  reset();
                  setMessage("Dados de exemplo restaurados.");
                }}
              >
                <RotateCcw className="h-4 w-4" /> Restaurar exemplo
              </Button>
            </div>
            {message && (
              <p
                className={cx(
                  "mt-4 rounded-lg border px-3 py-2 text-xs",
                  "border-line-soft bg-raised/40 text-muted",
                )}
              >
                {message}
              </p>
            )}
          </section>

          <p className="text-center text-xs text-muted">
            {state.transactions.length}{" "}
            {plural(
              state.transactions.length,
              "movimentação",
              "movimentações",
            )}{" "}
            · {state.cards.length}{" "}
            {plural(state.cards.length, "cartão", "cartões")} ·{" "}
            {state.tags.length} {plural(state.tags.length, "tag", "tags")}
          </p>
        </div>
      </PageBody>
    </>
  );
}

function PasswordCard() {
  const { user } = useAuth();
  const hasPassword = Boolean(user?.hasPassword);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const valid =
    passwordIsValid(password) &&
    confirm === password &&
    (!hasPassword || current.length > 0);

  async function submit() {
    if (!valid) return;
    setError(null);
    setMsg(null);
    setLoading(true);
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: {
          currentPassword: hasPassword ? current : undefined,
          password,
        },
      });
      setMsg(hasPassword ? "Senha alterada." : "Senha definida.");
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(
        m === "pwned_password"
          ? "Essa senha apareceu em vazamentos. Escolha outra."
          : m === "invalid_credentials"
            ? "Senha atual incorreta."
            : m === "current_required"
              ? "Informe a senha atual."
              : "Não foi possível salvar. Verifique os requisitos.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-panel p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Shield className="h-4 w-4 text-brand" />{" "}
        {hasPassword ? "Alterar senha" : "Definir senha"}
      </h2>
      <p className="mt-1 mb-4 text-xs text-muted">
        {hasPassword
          ? "Troque sua senha periodicamente."
          : "Você entrou com o Google. Defina uma senha para entrar também por e-mail."}
      </p>
      <div className="flex max-w-md flex-col gap-4">
        {hasPassword && (
          <Field label="Senha atual">
            <PasswordInput
              value={current}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
        )}
        <Field label={hasPassword ? "Nova senha" : "Senha"}>
          <PasswordInput
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ul className="flex flex-col gap-1">
          {PASSWORD_RULES.map((r) => (
            <li
              key={r.key}
              className={cx(
                "flex items-center gap-1.5 text-xs",
                r.test(password) ? "text-[#4fa03f]" : "text-muted",
              )}
            >
              <Check className="h-3 w-3" /> {r.label}
            </li>
          ))}
        </ul>
        <Field
          label="Repetir senha"
          hint={
            confirm.length > 0 && confirm !== password
              ? "As senhas não conferem"
              : undefined
          }
        >
          <PasswordInput
            value={confirm}
            autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-lg border border-line-soft bg-red/10 px-3 py-2 text-xs text-red">
            {error}
          </p>
        )}
        {msg && (
          <p className="rounded-lg border border-line-soft bg-brand/10 px-3 py-2 text-xs text-brand">
            {msg}
          </p>
        )}
        <Button onClick={submit} disabled={!valid || loading} className="w-fit">
          <Check className="h-4 w-4" />{" "}
          {hasPassword ? "Alterar senha" : "Definir senha"}
        </Button>
      </div>
    </section>
  );
}
