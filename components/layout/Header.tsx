"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Phone } from "lucide-react";
import { CLINIC } from "@/lib/constants";

const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "병원 소개", href: "/about" },
  { label: "진료 안내", href: "/treatments" },
  { label: "건강정보", href: "/blog" },
  { label: "상담 안내", href: "/contact" },
];

export function Header() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 본문 바로가기 링크 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white"
      >
        본문 바로가기
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 shadow-sm backdrop-blur-sm border-b border-[var(--color-gold-light)]/30"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/Logo_SNU.png"
              alt="서울대학교 엠블럼"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-2xl font-bold tracking-tight text-[var(--color-primary)] md:text-xl">
              {CLINIC.name}
            </span>
          </Link>

          {/* 데스크톱 네비게이션 (홈은 로고가 대체) */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="메인 메뉴">
            {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive
                      ? "text-[var(--color-primary)]"
                      : "text-gray-700"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
            <a
              href={CLINIC.phoneHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
              aria-label={`전화 상담 ${CLINIC.phone}`}
            >
              <Phone size={16} aria-hidden="true" />
              {CLINIC.phone}
            </a>
          </nav>

          {/* 모바일 햄버거 버튼 */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="border-t border-gray-100 bg-white md:hidden"
            role="navigation"
            aria-label="모바일 메뉴"
          >
            <nav className="flex flex-col px-4 py-4">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[44px] items-center border-b border-gray-50 text-base font-medium ${
                      isActive
                        ? "text-[var(--color-primary)]"
                        : "text-gray-700"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <a
                href={CLINIC.phoneHref}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-base font-medium text-white"
                aria-label={`전화 상담 ${CLINIC.phone}`}
              >
                <Phone size={18} aria-hidden="true" />
                전화 상담 {CLINIC.phone}
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
