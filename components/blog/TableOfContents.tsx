"use client";

import { useEffect, useId, useRef, useState } from "react";
import { List, ChevronDown } from "lucide-react";

interface TableOfContentsProps {
  headings: string[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const observerRef = useRef<IntersectionObserver | null>(null);

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
      <div className="hidden items-center gap-2 text-sm font-semibold text-[var(--foreground)] md:flex">
        <List size={16} className="text-[var(--color-primary)]" aria-hidden="true" />
        목차
      </div>
      {/* 모바일만 접기·펼치기 버튼을 제공한다. */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between md:hidden"
        aria-expanded={isOpen}
        aria-controls={listId}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <List size={16} className="text-[var(--color-primary)]" />
          목차
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--muted-light)] transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 서버 HTML부터 목록을 포함해 데스크톱의 초기 높이를 유지한다. */}
      <ol id={listId} className={`mt-3 space-y-1 ${isOpen ? "block" : "hidden"} md:block`}>
        {headings.map((heading, i) => {
          const isActive = activeIndex === i;
          return (
            <li key={i}>
              <a
                href={`#section-${i}`}
                onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                className={`block border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                  isActive
                    ? "border-[var(--color-primary)] font-medium text-[var(--color-primary)]"
                    : "border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
                }`}
              >
                {heading}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
