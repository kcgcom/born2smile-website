"use client";

import { useEffect, useRef, useState } from "react";
import { List, ChevronDown } from "lucide-react";

interface TableOfContentsProps {
  headings: string[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const rafId = window.requestAnimationFrame(() => {
      setIsOpen(mediaQuery.matches);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  // 스크롤 스파이: IntersectionObserver로 현재 보이는 섹션 추적
  useEffect(() => {
    const sectionEls = headings.map((_, i) =>
      document.getElementById(`section-${i}`)
    );

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const idx = parseInt(id.replace("section-", ""), 10);
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    for (const el of sectionEls) {
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [headings]);

  return (
    <nav
      aria-label="목차"
      className="mb-8 rounded-xl border border-blue-100 bg-blue-50/40 p-4"
    >
      {/* 헤더 — 모바일에서 탭하여 토글 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between md:cursor-default"
        aria-expanded={isOpen}
        aria-controls="toc-list"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <List size={16} className="text-[var(--color-primary)]" />
          목차
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform md:hidden ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 목록 */}
      {isOpen && (
        <ol id="toc-list" className="mt-3 space-y-1">
          {headings.map((heading, i) => {
            const isActive = activeIndex === i;
            return (
              <li key={i}>
                <a
                  href={`#section-${i}`}
                  onClick={() => setIsOpen(false)}
                  className={`block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                    isActive
                      ? "border-[var(--color-primary)] font-medium text-[var(--color-primary)]"
                      : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  {heading}
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}
