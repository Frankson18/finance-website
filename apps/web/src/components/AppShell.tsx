"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus, WifiOff, X } from "lucide-react";
import { Sidebar, SidebarContent } from "./Sidebar";
import { IconButton } from "./ui";
import { useUI } from "./ui-context";
import { useStore } from "@/lib/store";

function SyncToast() {
  const { syncError } = useStore();
  if (!syncError) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-lg border border-red/40 bg-red/15 px-4 py-2 text-xs font-semibold text-red backdrop-blur-sm">
      <WifiOff className="h-4 w-4 shrink-0" />
      {syncError}
    </div>
  );
}

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  const { openTransactionDialog } = useUI();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-3 lg:hidden">
      <div className="flex items-center gap-2">
        <IconButton onClick={onMenu} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </IconButton>
        <Link href="/saldos" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-black text-white">
            F
          </span>
          <span className="text-sm font-black tracking-tight">Fluxo</span>
        </Link>
      </div>
      <IconButton
        variant="primary"
        onClick={() => openTransactionDialog()}
        aria-label="Nova movimentação"
      >
        <Plus className="h-5 w-5" />
      </IconButton>
    </header>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-40 lg:hidden ${
        open ? "" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 left-0 w-64 border-r border-line bg-panel transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end px-3 pt-3">
          <IconButton onClick={onClose} aria-label="Fechar menu">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);

  return (
    <>
      <div className="flex h-dvh overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader onMenu={() => setDrawer(true)} />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </div>
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
      <SyncToast />
    </>
  );
}
