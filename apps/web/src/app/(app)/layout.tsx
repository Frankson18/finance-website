"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/components/UIProvider";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg p-6">
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  return (
    <StoreProvider>
      <UIProvider>
        <AppShell>{children}</AppShell>
      </UIProvider>
    </StoreProvider>
  );
}
