"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface ScrollIndicatorProps {
  href: string;
}

export function ScrollIndicator({ href }: ScrollIndicatorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY < 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <a
      href={href}
      aria-label="아래로 스크롤"
      className={`scroll-indicator fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] left-1/2 z-30 -translate-x-1/2 text-[var(--muted-light)] transition-opacity duration-300 hover:text-[var(--color-primary)] md:bottom-8 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <ChevronDown size={28} strokeWidth={1.5} />
    </a>
  );
}
