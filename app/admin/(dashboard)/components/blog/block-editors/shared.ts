import type { BlogBlock } from "@/lib/blog/types";

export function inputClass(hasError: boolean, readOnly = false): string {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2",
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-100"
      : "border-[var(--border)] bg-white focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/15",
    readOnly ? "bg-[var(--background)] cursor-not-allowed" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function emptyBlock(type: BlogBlock["type"] = "paragraph"): BlogBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "list":
      return { type: "list", style: "bullet", items: ["", ""] };
    case "faq":
      return { type: "faq", question: "", answer: "" };
    case "image":
      return { type: "image", src: "/images/blog/example.png", alt: "", hidden: false, decorative: false };
    case "relatedLinks":
      return { type: "relatedLinks", items: [{ title: "", href: "", description: "" }] };
    case "table":
      return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "paragraph":
    default:
      return { type: "paragraph", text: "" };
  }
}

export const BLOCK_LABELS: Record<BlogBlock["type"], string> = {
  heading: "제목",
  paragraph: "문단",
  list: "목록",
  faq: "FAQ",
  image: "이미지",
  relatedLinks: "관련 링크",
  table: "표",
  researchCallout: "연구 자료",
};
