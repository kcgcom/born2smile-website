"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PathSubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function PathSubNav({
  parentLabel,
  ariaLabel,
  items,
}: {
  parentLabel: string;
  ariaLabel: string;
  items: PathSubNavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 rounded-xl bg-slate-100/80 p-1"
      aria-label={ariaLabel}
    >
      <div className="hidden shrink-0 items-center gap-0.5 px-3 sm:flex">
        <span className="text-xs font-medium text-slate-500">{parentLabel}</span>
        <ChevronRight size={11} className="text-slate-400" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:flex xl:flex-row xl:items-center xl:gap-1 xl:overflow-x-auto xl:[-ms-overflow-style:none] xl:[scrollbar-width:none] xl:[&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] transition-all xl:min-w-[112px] xl:flex-1 xl:gap-1.5 xl:whitespace-nowrap xl:px-3 xl:py-1.5 xl:text-xs ${
                active
                  ? "bg-white font-semibold text-amber-600 shadow-sm"
                  : "font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
