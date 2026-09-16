"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChartColumnBig,
  CreditCard,
  PiggyBank,
  PlusCircle,
  Tags,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { useUI } from "./ui-context";
import { cx } from "./ui";

const NAV = [
  { href: "/saldos", label: "saldos", icon: Wallet },
  { href: "/totais", label: "totais", icon: ChartColumnBig },
  { href: "/economias", label: "economias", icon: PiggyBank },
  { href: "/tags", label: "tags", icon: Tags },
  { href: "/cartoes", label: "cartões", icon: CreditCard },
  { href: "/horizonte", label: "horizonte", icon: TrendingUp },
];

function Item({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: typeof Wallet;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative flex h-10 w-full items-center rounded-lg pl-11 pr-3 text-left text-[13px] font-bold transition-colors",
        active
          ? "bg-brand/12 text-brand"
          : "text-muted hover:bg-raised hover:text-ink",
      )}
    >
      <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { openTransactionDialog, goToToday } = useUI();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/saldos"
        onClick={onNavigate}
        className="flex h-13 items-center gap-2 px-4 py-3"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">
          F
        </span>
        <span className="text-sm font-black tracking-tight text-ink">Fluxo</span>
      </Link>

      <nav className="flex flex-col gap-1 px-2 py-2">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Item
              active={pathname === item.href}
              icon={item.icon}
              label={item.label}
            />
          </Link>
        ))}

        <div className="my-2 h-px w-full bg-line-soft" />

        <Item
          icon={PlusCircle}
          label="adicionar"
          onClick={() => {
            onNavigate?.();
            openTransactionDialog();
          }}
        />
        <Item
          icon={CalendarCheck}
          label="ir pra hoje"
          onClick={() => {
            onNavigate?.();
            goToToday();
          }}
        />
      </nav>

      <div className="mt-auto flex flex-col gap-1 px-2 pb-3">
        <div className="mx-2 mb-2 h-px bg-line-soft" />
        <Link href="/conta" onClick={onNavigate}>
          <Item
            active={pathname === "/conta"}
            icon={User}
            label="conta"
          />
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-36 shrink-0 border-r border-line bg-panel lg:flex lg:flex-col">
      <SidebarContent />
    </aside>
  );
}
