"use client";

import { useRef, useEffect, type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  duration?: number;
}

const directionVars: Record<string, { "--fade-tx": string; "--fade-ty": string }> = {
  up: { "--fade-tx": "0px", "--fade-ty": "40px" },
  down: { "--fade-tx": "0px", "--fade-ty": "-40px" },
  left: { "--fade-tx": "40px", "--fade-ty": "0px" },
  right: { "--fade-tx": "-40px", "--fade-ty": "0px" },
};

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 스크롤 시 페이드인 애니메이션
 * prefers-reduced-motion 설정 시 애니메이션 비활성화
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 0.6,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    // 이미 뷰포트 안에 있으면 애니메이션 없이 즉시 표시
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add("is-visible-immediate");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { rootMargin: "-80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const vars = directionVars[direction];

  return (
    <div
      ref={ref}
      className={`fade-in-target${className ? ` ${className}` : ""}`}
      style={{
        ...vars,
        "--fade-dur": `${duration}s`,
        "--fade-delay": `${delay}s`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * 자식 요소를 순차적으로 애니메이션
 * prefers-reduced-motion 설정 시 애니메이션 비활성화
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    // 이미 뷰포트 안에 있으면 애니메이션 없이 즉시 표시
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.querySelectorAll("[data-stagger-item]").forEach((item) => {
        (item as HTMLElement).classList.add("is-visible-immediate");
      });
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const items = el.querySelectorAll("[data-stagger-item]");
          items.forEach((item, i) => {
            (item as HTMLElement).style.animationDelay = `${i * staggerDelay}s`;
            item.classList.add("is-visible");
          });
          observer.unobserve(el);
        }
      },
      { rootMargin: "-80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, staggerDelay]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * StaggerContainer 안에서 사용하는 아이템
 * prefers-reduced-motion 설정 시 애니메이션 비활성화
 */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-stagger-item="" className={className}>
      {children}
    </div>
  );
}
