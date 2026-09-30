import { z } from "zod/v4";
import { BLOG_TAGS } from "./blog/types";
import { normalizeBlogCategory } from "./blog/category-slugs";
import { MAX_BLOG_BLOCKS } from "./blog/normalize-blocks";
import { getCitationQuoteError, isCitationSourceHref, isResearchCitationHref } from "./blog/citations";

const slugRegex = /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/;

const categorySchema = z
  .string()
  .refine((value) => normalizeBlogCategory(value) !== null, {
    message: "유효한 블로그 카테고리여야 합니다",
  })
  .transform((value) => normalizeBlogCategory(value)!);

const relatedLinkSchema = z.object({
  title: z.string().min(2).max(120),
  href: z.string().min(1).max(300),
  description: z.string().max(300).optional(),
});

const citationSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  quote: z.string().min(2).max(1000),
  title: z.string().min(2).max(150),
  summary: z.string().min(10).max(600),
  sourceLabel: z.string().min(2).max(150),
  researchHref: z.string().max(300).refine(isResearchCitationHref, "연구 자료의 논문 위치 링크를 입력해 주세요"),
  sourceHref: z.string().max(500).refine(isCitationSourceHref, "https 원문 링크를 입력해 주세요"),
});

const blogBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    // FAQ questions (up to 150 chars) must survive conversion into a heading.
    text: z.string().min(2).max(150),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(20).max(3000),
    citations: z.array(citationSchema).max(5).optional(),
  }),
  z.object({
    type: z.literal("list"),
    style: z.preprocess(
      (value) => {
        if (value === "ordered") return "number";
        if (value === "unordered" || value === undefined) return "bullet";
        return value;
      },
      z.union([z.literal("bullet"), z.literal("number")]),
    ),
    items: z.array(z.string().min(2).max(300)).min(2).max(10),
  }),
  z.object({
    type: z.literal("faq"),
    question: z.string().min(5).max(150),
    answer: z.string().min(20).max(3000),
    citations: z.array(citationSchema).max(5).optional(),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string().min(1).max(500),
    alt: z.string().max(150),
    caption: z.string().max(200).optional(),
    width: z.number().int().positive().max(5000).optional(),
    height: z.number().int().positive().max(5000).optional(),
    hidden: z.boolean().optional(),
    decorative: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("relatedLinks"),
    items: z.array(relatedLinkSchema).min(1).max(6),
  }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string().min(1).max(60)).min(2).max(8),
    rows: z.array(z.array(z.string().max(200)).min(2).max(8)).min(1).max(20),
  }),
  z.object({
    type: z.literal("researchCallout"),
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(300),
    href: z.string().min(1).max(300),
    linkText: z.string().min(2).max(80),
  }),
]);

const blogPostBaseSchema = z.object({
  slug: z.string().regex(slugRegex, "slug은 소문자, 숫자, 하이픈만 허용 (2자 이상)"),
  title: z.string().min(5).max(100),
  subtitle: z.string().min(5).max(150),
  excerpt: z.string().min(20).max(500),
  category: categorySchema,
  tags: z.array(z.enum(BLOG_TAGS as unknown as [string, ...string[]])).max(5),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  blocks: z.array(blogBlockSchema).min(1).max(MAX_BLOG_BLOCKS, `본문 블록은 최대 ${MAX_BLOG_BLOCKS}개까지 저장할 수 있습니다. 초과한 내용은 삭제하지 않았습니다.`).superRefine((blocks, ctx) => {
    const seen = new Map<string, string>();
    blocks.forEach((block, index) => {
      if (block.type !== "paragraph" && block.type !== "faq") return;
      const text = block.type === "paragraph" ? block.text : block.answer;
      const citations = block.citations ?? [];
      const ranges: { start: number; end: number }[] = [];
      citations.forEach((citation, citationIndex) => {
        const label = `블록 ${index + 1} · 주석 ${citationIndex + 1} 「${citation.title}」`;
        const quoteError = getCitationQuoteError(text, citation.quote);
        const start = text.indexOf(citation.quote);
        const end = start + citation.quote.length;
        if (quoteError || ranges.some((range) => start < range.end && end > range.start)) {
          ctx.addIssue({ code: "custom", path: [index, "citations", citationIndex, "quote"], message: `${label}: ${quoteError ?? "다른 주석의 연결 문장과 겹칩니다. 겹치지 않는 구간으로 지정해 주세요."}` });
        }
        if (!quoteError) ranges.push({ start, end });
        const value = JSON.stringify(citation);
        if (seen.has(citation.id) && seen.get(citation.id) !== value) {
          ctx.addIssue({ code: "custom", path: [index, "citations", citationIndex, "id"], message: `${label}: 다른 주석과 식별자가 중복됩니다. 이 주석을 삭제하고 다시 추가해 주세요.` });
        }
        seen.set(citation.id, value);
      });
    });
  }),
  published: z.boolean(),
});

export const blogPostSchema = blogPostBaseSchema;

export const blogPostUpdateSchema = blogPostBaseSchema
  .partial()
  .omit({ slug: true });

export const adminAiWriteRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(4000),
    }),
  ).min(1).max(20),
  mode: z.enum(["chat", "generate"]),
});

// ---------------------------------------------------------------------------
// Site Config Schemas
// ---------------------------------------------------------------------------

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const optionalHttpUrlSchema = z
  .string()
  .max(200)
  .refine((value) => value === "" || isHttpUrl(value), {
    message: "http/https URL 형식이어야 합니다",
  });

export const siteLinksSchema = z.object({
  kakaoChannel: optionalHttpUrlSchema,
  instagram: optionalHttpUrlSchema,
  naverBlog: optionalHttpUrlSchema,
  naverMap: optionalHttpUrlSchema,
  kakaoMap: optionalHttpUrlSchema,
});

export const siteClinicSchema = z.object({
  name: z.string().min(1).max(100),
  nameEn: z.string().max(100),
  slogan: z.string().max(200),
  phone: z.string().max(20),
  address: z.string().max(200),
  addressShort: z.string().max(100),
  neighborhood: z.string().max(50),
  businessNumber: z.string().max(20),
  representative: z.string().max(50),
});

const scheduleItemSchema = z.object({
  day: z.string().min(1).max(10),
  time: z.string().max(50),
  open: z.boolean(),
  note: z.string().max(100).optional(),
});

const scheduleExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "예외 일정 날짜 형식이 올바르지 않습니다"),
  time: z.string().max(50),
  open: z.boolean(),
  note: z.string().max(100).optional(),
});

export const siteHoursSchema = z.object({
  schedule: z.array(scheduleItemSchema).min(1).max(10),
  exceptions: z.array(scheduleExceptionSchema).max(30),
  lunchTime: z.string().max(50),
  closedDays: z.string().max(100),
  notice: z.string().max(200),
});

// ---------------------------------------------------------------------------
// Publish Schedule Schema
// ---------------------------------------------------------------------------

export const siteScheduleSchema = z.object({
  publishDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});
