import { z } from "zod/v4";
import { BLOG_TAGS } from "./blog/types";
import { normalizeBlogCategory } from "./blog/category-slugs";
import { MAX_BLOG_BLOCKS } from "./blog/normalize-blocks";

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

const blogBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(2).max(120),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(20).max(3000),
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
  blocks: z.array(blogBlockSchema).min(1).max(MAX_BLOG_BLOCKS),
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
