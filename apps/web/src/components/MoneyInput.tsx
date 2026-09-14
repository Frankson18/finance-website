"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumberInput } from "@/lib/format";
import { cx } from "./ui";

function toDigits(value: number): string {
  const cents = Math.round((value || 0) * 100);
  return cents > 0 ? String(cents) : "0";
}

export function MoneyInput({
  value,
  onChange,
  className,
  autoFocus,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const [digits, setDigits] = useState(() => toDigits(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const digitsRef = useRef(digits);
  digitsRef.current = digits;

  useEffect(() => {
    setDigits((current) => {
      if (Math.abs(Number(current) / 100 - (value || 0)) > 0.0001) {
        return toDigits(value);
      }
      return current;
    });
  }, [value]);

  const text = formatNumberInput(Number(digits) / 100);

  function commit(next: string) {
    const capped = next.replace(/\D/g, "").slice(0, 15) || "0";
    digitsRef.current = capped;
    setDigits(capped);
    onChange(Number(capped) / 100);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const d = digitsRef.current === "0" ? e.key : digitsRef.current + e.key;
      commit(d);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      commit(
        digitsRef.current.length <= 1
          ? "0"
          : digitsRef.current.slice(0, -1),
      );
    } else if (e.key === "Delete") {
      e.preventDefault();
      commit("0");
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    let d = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (d === "") d = "0";
    commit(d);
  }

  return (
    <div
      className={cx(
        "flex h-10 items-center gap-2 rounded-lg border border-line bg-raised px-3 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20",
        className,
      )}
    >
      <span className="text-sm font-semibold text-muted">R$</span>
      <input
        id={id}
        ref={inputRef}
        inputMode="numeric"
        autoFocus={autoFocus}
        className="h-full w-full bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:text-dim"
        value={text}
        placeholder="0,00"
        onFocus={(e) => {
          const el = e.currentTarget;
          requestAnimationFrame(() =>
            el.setSelectionRange(el.value.length, el.value.length),
          );
        }}
        onKeyDown={handleKeyDown}
        onChange={handleInput}
      />
    </div>
  );
}
