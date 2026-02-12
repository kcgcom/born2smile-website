"use client";

import { Phone, MessageCircle, MapPin, CalendarCheck } from "lucide-react";
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
          <a
            href={CLINIC.phoneHref}
            aria-label="전화 상담"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <Phone size={20} aria-hidden="true" />
            전화
          </a>
          <a
            href={CLINIC.phoneHref}
            aria-label="카카오톡 상담"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <MessageCircle size={20} aria-hidden="true" />
            상담
          </a>
          <a
            href={`https://map.kakao.com/link/to/${CLINIC.name},${CLINIC.address}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="오시는 길 - 카카오맵"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs text-gray-600 transition-colors hover:text-[var(--color-primary)]"
          >
            <MapPin size={20} aria-hidden="true" />
            오시는 길
          </a>
          <a
            href="/contact"
            aria-label="온라인 예약"
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-medium text-[var(--color-gold)]"
          >
            <CalendarCheck size={20} aria-hidden="true" />
            예약
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
