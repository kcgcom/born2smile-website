import { z } from "zod/v4";
import { BLOG_TAGS } from "./blog/types";
import { normalizeBlogCategory } from "./blog/category-slugs";

const slugRegex = /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/;

const categorySchema = z
  .string()
  .refine((value) => normalizeBlogCategory(value) !== null, {
    message: "유효한 블로그 카테고리여야 합니다",
  })
  .transform((value) => normalizeBlogCategory(value)!);

export const blogPostContentSchema = z.object({
  heading: z.string().min(2).max(100),
  content: z.string().min(50).max(3000),
});

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
    style: z.union([z.literal("bullet"), z.literal("number")]),
    items: z.array(z.string().min(2).max(300)).min(2).max(10),
  }),
  z.object({
    type: z.literal("faq"),
    question: z.string().min(5).max(150),
    answer: z.string().min(20).max(3000),
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
  content: z.array(blogPostContentSchema).min(1).max(10).optional(),
  blocks: z.array(blogBlockSchema).min(1).max(30).optional(),
  published: z.boolean(),
});

export const blogPostSchema = blogPostBaseSchema.superRefine((data, ctx) => {
  if ((!data.content || data.content.length === 0) && (!data.blocks || data.blocks.length === 0)) {
    ctx.addIssue({
      code: "custom",
      path: ["content"],
      message: "content 또는 blocks 중 하나는 반드시 필요합니다",
    });
  }
});

export const blogPostUpdateSchema = blogPostBaseSchema
  .partial()
  .omit({ slug: true })
  .superRefine((data, ctx) => {
    const hasContent = data.content && data.content.length > 0;
    const hasBlocks = data.blocks && data.blocks.length > 0;
    if (data.content !== undefined || data.blocks !== undefined) {
      if (!hasContent && !hasBlocks) {
        ctx.addIssue({
          code: "custom",
          path: ["content"],
          message: "content 또는 blocks 중 하나는 반드시 필요합니다",
        });
      }
    }
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
  phoneIntl: z.string().max(30),
  phoneHref: z.string().max(30),
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

export const siteHoursSchema = z.object({
  schedule: z.array(scheduleItemSchema).min(1).max(10),
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
