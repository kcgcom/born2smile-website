"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Building2, BookOpen, Stethoscope } from "lucide-react";
import { CLINIC } from "@/lib/constants";

export function FloatingCTA() {
  const pathname = usePathname();

  const navItems = [
    { href: "/about", label: "병원소개", icon: Building2 },
    { href: "/treatments", label: "진료안내", icon: Stethoscope },
    { href: "/blog", label: "블로그", icon: BookOpen },
    { href: "/contact", label: "상담안내", icon: Phone },
  ] as const;

  return (
    <>
      {/* 모바일 하단 고정 바 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden"
        aria-label="빠른 메뉴"
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const isContact = item.href === "/contact";
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-sm transition-colors ${
                  isActive
                    ? "font-medium text-[var(--color-primary)]"
                    : isContact
                      ? "font-medium text-[var(--color-gold)]"
                      : "text-gray-600 hover:text-[var(--color-primary)]"
                }`}
              >
                <item.icon size={22} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 데스크톱 플로팅 전화 버튼 */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <a
          href={CLINIC.phoneHref}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg transition-transform hover:scale-110 hover:bg-[var(--color-primary-dark)]"
          aria-label="전화 상담"
        >
          <Phone size={24} aria-hidden="true" />
        </a>
      </div>
    </>
  );
}
