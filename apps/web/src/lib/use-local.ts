"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setSet(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, [key]);

  const toggle = useCallback(
    (value: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        try {
          window.localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );

  const clear = useCallback(() => {
    setSet(new Set());
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return { set, toggle, clear };
}
