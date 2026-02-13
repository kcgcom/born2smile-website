"use client";

import Link from "next/link";
import { Phone, Building2, BookOpen, Home } from "lucide-react";
import { CLINIC } from "@/lib/constants";

export function FloatingCTA() {
  return (
    <>
      {/* 모바일 하단 고정 바 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden"
        aria-label="빠른 메뉴"
      >
        <div className="grid grid-cols-4">
          <Link
            href="/#hero"
            aria-label="홈"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <Home size={20} aria-hidden="true" />
            홈
          </Link>
          <Link
            href="/about"
            aria-label="병원소개"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <Building2 size={20} aria-hidden="true" />
            병원소개
          </Link>
          <Link
            href="/blog"
            aria-label="블로그"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <BookOpen size={20} aria-hidden="true" />
            블로그
          </Link>
          <a
            href={CLINIC.phoneHref}
            aria-label="전화 상담"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-medium text-[var(--color-gold)]"
          >
            <Phone size={20} aria-hidden="true" />
            전화
          </a>
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
