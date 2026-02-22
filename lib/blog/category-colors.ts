// =============================================================
// 블로그 카테고리 색상 (목록/상세 공유)
// =============================================================

import type { BlogCategoryValue } from "./types";

export const categoryColors: Record<BlogCategoryValue, string> = {
  "예방관리": "bg-blue-100 text-blue-700",
  보존치료: "bg-green-100 text-green-700",
  보철치료: "bg-purple-100 text-purple-700",
  임플란트: "bg-rose-100 text-rose-700",
  치아교정: "bg-[#FDF3E0] text-[var(--color-gold-dark)]",
  소아치료: "bg-orange-100 text-orange-700",
  건강상식: "bg-teal-100 text-teal-700",
};
