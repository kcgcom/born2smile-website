import { z } from "zod/v4";
import { BLOG_CATEGORIES, BLOG_TAGS } from "./blog/types";

const slugRegex = /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/;

const categoryValues = BLOG_CATEGORIES.filter(
  (c): c is Exclude<typeof c, "전체"> => c !== "전체"
);

export const blogPostContentSchema = z.object({
  heading: z.string().min(2).max(100),
  content: z.string().min(50).max(3000),
});

export const blogPostSchema = z.object({
  slug: z.string().regex(slugRegex, "slug은 소문자, 숫자, 하이픈만 허용 (2자 이상)"),
  title: z.string().min(5).max(100),
  subtitle: z.string().min(5).max(150),
  excerpt: z.string().min(20).max(500),
  category: z.enum(categoryValues as unknown as [string, ...string[]]),
  tags: z.array(z.enum(BLOG_TAGS as unknown as [string, ...string[]])).max(5),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  dateModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  content: z.array(blogPostContentSchema).min(1).max(10),
  published: z.boolean(),
});

export const blogPostUpdateSchema = blogPostSchema.partial().omit({ slug: true });

export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type BlogPostUpdateInput = z.infer<typeof blogPostUpdateSchema>;

// ---------------------------------------------------------------------------
// Site Config Schemas
// ---------------------------------------------------------------------------

export const siteLinksSchema = z.object({
  kakaoChannel: z.string().max(200),
  instagram: z.string().max(200),
  naverBlog: z.string().max(200),
  naverMap: z.string().max(200),
  kakaoMap: z.string().max(200),
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
