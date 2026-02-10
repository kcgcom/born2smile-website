"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";
import { CLINIC } from "@/lib/constants";

const NAV_ITEMS = [
  { label: "병원 소개", href: "/about" },
  { label: "진료 안내", href: "/treatments" },
  { label: "블로그", href: "/blog" },
  { label: "예약/상담", href: "/contact" },
];

export function Header() {
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 shadow-sm backdrop-blur-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        {/* 로고 */}
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-[var(--color-primary)]">{CLINIC.name}</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-[var(--color-primary)]"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={CLINIC.phoneHref}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <Phone size={16} />
            {CLINIC.phone}
          </a>
        </nav>

        {/* 모바일 햄버거 버튼 */}
        <button
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="메뉴 열기"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <nav className="flex flex-col px-4 py-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-gray-50 py-3 text-base font-medium text-gray-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={CLINIC.phoneHref}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-base font-medium text-white"
            >
              <Phone size={18} />
              전화 상담 {CLINIC.phone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
