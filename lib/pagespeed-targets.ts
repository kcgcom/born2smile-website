export const PAGESPEED_TARGETS = [
  { id: "home", label: "홈페이지", path: "" },
  { id: "blog", label: "블로그 글 · 골다공증과 임플란트", path: "/blog/implant/osteoporosis-and-implant" },
  { id: "implant", label: "임플란트 안내", path: "/treatments/implant" },
  { id: "contact", label: "오시는 길", path: "/contact" },
] as const;

export type PageSpeedTarget = (typeof PAGESPEED_TARGETS)[number];
