"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { CLOSE_MOBILE_MENU_EVENT } from "./mobileMenuEvents";

export function useMobileNavigation(panelId?: string) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const id = panelId ?? generatedId;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => setOpen(false);
    const desktop = window.matchMedia("(min-width: 64rem)");
    const trigger = document.getElementById(`${id}-trigger`);
    const panel = document.getElementById(id);

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        trigger?.focus();
        return;
      }
      if (event.key !== "Tab" || !trigger || !panel) return;
      const first = trigger;
      const items = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      const last = items[items.length - 1] ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const handleResize = () => { if (desktop.matches) close(); };
    document.addEventListener("keydown", handleKey);
    window.addEventListener(CLOSE_MOBILE_MENU_EVENT, close);
    desktop.addEventListener("change", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener(CLOSE_MOBILE_MENU_EVENT, close);
      desktop.removeEventListener("change", handleResize);
    };
  }, [id, open]);

  return { open, setOpen, id };
}

type MobileMenu = ReturnType<typeof useMobileNavigation>;

export function MobileMenuButton({ menu }: { menu: MobileMenu }) {
  return (
    <button
      id={`${menu.id}-trigger`}
      type="button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={() => menu.setOpen((open) => !open)}
      aria-label={menu.open ? "메뉴 닫기" : "메뉴 열기"}
      aria-expanded={menu.open}
      aria-controls={menu.open ? menu.id : undefined}
    >
      {menu.open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
    </button>
  );
}

export function MobileMenuPanel({ menu, pathname, onNavigate, className = "", children }: {
  menu: MobileMenu;
  pathname: string;
  onNavigate?: (href: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  if (!menu.open) return null;
  return (
    <div id={menu.id} className={`min-h-0 overflow-y-auto overscroll-contain border-t border-[var(--border)] bg-[var(--surface)] lg:hidden ${className}`}>
      <nav className="flex flex-col px-4 py-4" aria-label="모바일 메뉴">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href}
              className={`flex min-h-11 items-center border-b border-[var(--background)] text-base font-medium ${active ? "text-[var(--color-primary)]" : "text-[var(--foreground)]"}`}
              aria-current={active ? "page" : undefined}
              onClick={() => { menu.setOpen(false); onNavigate?.(href); }}
            >
              {label}
            </Link>
          );
        })}
        {children}
      </nav>
    </div>
  );
}
