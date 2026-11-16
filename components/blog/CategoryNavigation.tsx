"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ALL_CATEGORY_SLUGS, getCategoryLabel, type BlogCategorySlug } from "@/lib/blog";

export default function CategoryNavigation({ category }: { category: BlogCategorySlug }) {
  const scroller = useRef<HTMLDivElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = () => {
    const node = scroller.current;
    if (node) setEdges({ left: node.scrollLeft > 1, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 1 });
  };
  useEffect(() => {
    const node = scroller.current;
    const selected = active.current;
    if (node && selected && node.scrollWidth > node.clientWidth) {
      node.scrollLeft += selected.getBoundingClientRect().left - node.getBoundingClientRect().left - (node.clientWidth - selected.clientWidth) / 2;
    }
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [category]);
  return <nav aria-label="건강칼럼 주제" className="rounded-3xl border border-[var(--border)] bg-[var(--background)] p-3 md:p-5">
    <div className="relative">
      <div ref={scroller} onScroll={updateEdges} className="no-scrollbar flex gap-2 overflow-x-auto p-1 md:flex-wrap">
        {ALL_CATEGORY_SLUGS.map(slug => <Link ref={slug === category ? active : undefined} key={slug} href={`/blog/${slug}`} aria-current={slug === category ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${slug === category ? "bg-[var(--color-primary)] text-white" : "bg-[var(--surface)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-blue-50"}`}>{getCategoryLabel(slug)}</Link>)}
      </div>
      {edges.left && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex w-6 items-center bg-gradient-to-r from-[var(--background)] to-transparent text-[var(--muted)] md:hidden">‹</span>}
      {edges.right && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 flex w-6 items-center justify-end bg-gradient-to-l from-[var(--background)] to-transparent text-[var(--muted)] md:hidden">›</span>}
    </div>
    <Link href="/blog" className="mt-1 inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--color-primary)] hover:underline">건강칼럼 전체 보기 →</Link>
  </nav>;
}
