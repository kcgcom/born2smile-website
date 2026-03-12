// =============================================================
// 블로그 카테고리 색상 (목록/상세 공유)
// =============================================================

import type { BlogCategorySlug } from "./types";

export const categoryColors: Record<BlogCategorySlug, string> = {
  prevention: "bg-blue-100 text-blue-700",
  restorative: "bg-green-100 text-green-700",
  prosthetics: "bg-purple-100 text-purple-700",
  implant: "bg-rose-100 text-rose-700",
  orthodontics: "bg-[#FDF3E0] text-[var(--color-gold-dark)]",
  pediatric: "bg-orange-100 text-orange-700",
  "health-tips": "bg-teal-100 text-teal-700",
};
