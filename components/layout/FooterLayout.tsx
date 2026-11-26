"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function FooterLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <footer
      data-compact-mobile={pathname === "/review" ? "" : undefined}
      className="group/footer border-t-2 border-[var(--color-gold)]/30 bg-gray-900 text-gray-300"
    >
      {children}
    </footer>
  );
}
