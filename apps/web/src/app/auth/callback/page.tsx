"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { reload } = useAuth();

  useEffect(() => {
    void (async () => {
      await reload();
      router.replace("/saldos");
    })();
  }, [reload, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg text-muted">
      <Loader2 className="h-6 w-6 animate-spin text-brand" />
      <p className="text-sm">Entrando…</p>
    </div>
  );
}
