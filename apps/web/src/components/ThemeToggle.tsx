"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/appearance";
import { cx } from "./ui";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options: { key: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Claro", icon: Sun },
    { key: "dark", label: "Escuro", icon: Moon },
    { key: "system", label: "Sistema", icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => setTheme(o.key)}
          className={cx(
            "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
            theme === o.key
              ? "border-brand bg-brand/10 text-brand"
              : "border-line text-muted hover:bg-raised hover:text-ink",
          )}
        >
          <o.icon className="h-4 w-4" /> {o.label}
        </button>
      ))}
    </div>
  );
}

export function ThemeQuickToggle() {
  const { resolved, setTheme } = useTheme();
  const next: ThemeChoice = resolved === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "Ativar tema escuro" : "Ativar tema claro"}
      className="relative flex h-10 w-full items-center rounded-lg pl-11 pr-3 text-left text-[13px] font-bold text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
        {resolved === "dark" ? (
          <Moon className="h-[18px] w-[18px]" />
        ) : (
          <Sun className="h-[18px] w-[18px]" />
        )}
      </span>
      {resolved === "dark" ? "tema claro" : "tema escuro"}
    </button>
  );
}
