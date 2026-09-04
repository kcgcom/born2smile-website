"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Home, Building2, BookOpen, Stethoscope } from "lucide-react";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { closeMobileMenu } from "@/components/layout/mobileMenuEvents";
import { CLINIC, NAV_ITEMS } from "@/lib/constants";
import { getClinicStatus, type ClinicStatusInfo } from "@/lib/date";

const NAV_ICONS: Record<string, typeof Home> = {
  "/": Home,
  "/about": Building2,
  "/treatments": Stethoscope,
  "/blog": BookOpen,
  "/contact": Phone,
};

export function FloatingCTA() {
  const pathname = usePathname();
  const showDesktopPhone = !pathname.startsWith("/contact");

  const handleNavClick = useCallback(
    (href: string) => {
      closeMobileMenu();

      const isCurrentPage =
        href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
      if (isCurrentPage) {
        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    },
    [pathname]
  );

  return (
    <>
      {/* 모바일 하단 고정 바 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="빠른 메뉴"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isContact = item.href === "/contact";
            const Icon = NAV_ICONS[item.href] ?? Home;
            const className = `flex min-h-[64px] flex-col items-center justify-center gap-1 text-sm transition-colors ${
              isActive
                ? "font-medium text-[var(--color-primary)]"
                : isContact
                  ? "font-medium text-[var(--color-gold-dark)]"
                  : "text-[var(--muted)] hover:text-[var(--color-primary)]"
            }`;

            if (isContact) {
              return (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  event="floating_contact_nav_click"
                  properties={{ cta_location: "floating_mobile_nav", page_type: "global" }}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleNavClick(item.href)}
                  className={className}
                >
                  <Icon size={22} aria-hidden="true" />
                  {item.shortLabel}
                </TrackedLink>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.shortLabel}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleNavClick(item.href)}
                className={className}
              >
                <Icon size={22} aria-hidden="true" />
                {item.shortLabel}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 데스크톱 플로팅 전화 버튼 + 진료 상태 */}
      {showDesktopPhone && (
        <div
          className="fixed bottom-6 right-2 z-40 hidden xl:block"
          data-testid="desktop-floating-cta"
        >
          <DesktopPhoneButton />
        </div>
      )}
    </>
  );
}

const STATUS_STYLES: Record<ClinicStatusInfo["status"], { dot: string; text: string }> = {
  open: { dot: "bg-emerald-400", text: "text-emerald-700" },
  lunch: { dot: "bg-amber-400", text: "text-amber-700" },
  closed: { dot: "bg-[var(--muted-light)]", text: "text-[var(--muted)]" },
};

function DesktopPhoneButton() {
  const [info, setInfo] = useState<ClinicStatusInfo | null>(null);

  useEffect(() => {
    const update = () => {
      setInfo(getClinicStatus());
    };

    const rafId = window.requestAnimationFrame(update);
    const id = window.setInterval(() => {
      update();
    }, 60_000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(id);
    };
  }, []);

  const style = info ? STATUS_STYLES[info.status] : STATUS_STYLES.closed;

  return (
    <div className="group relative flex flex-col items-end">
      {info && (
        <div
          className="pointer-events-none absolute right-0 bottom-[calc(100%+0.5rem)] flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)]/70 bg-[var(--surface)]/95 px-3 py-1.5 text-xs font-medium opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 min-[1440px]:opacity-100"
          data-testid="desktop-floating-status"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
          <span className={style.text}>{info.message}</span>
        </div>
      )}
      <TrackedAnchor
        href={CLINIC.phoneHref}
        event="floating_phone_click"
        properties={{ cta_location: "floating_desktop_phone", page_type: "global" }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg ring-2 ring-blue-200/60 transition-transform hover:scale-110 hover:bg-[var(--color-primary-dark)]"
        aria-label={`전화 상담${info ? ` — ${info.message}` : ""}`}
      >
        <Phone size={24} aria-hidden="true" />
      </TrackedAnchor>
    </div>
  );
}
