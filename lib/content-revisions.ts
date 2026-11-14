import { z } from "zod/v4";
import { blogPostSchema } from "./blog-validation";
import { normalizeBlogBlocks } from "./blog/normalize-blocks";
import { BLOG_CATEGORY_SLUGS } from "./blog/types";

export const revisionContentSchema = blogPostSchema.pick({ title: true, subtitle: true, excerpt: true, category: true, tags: true, blocks: true })
  .extend({ category: z.enum(BLOG_CATEGORY_SLUGS) }).strict();
export const createRevisionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/),
  baseRevision: z.uuid(),
  reason: z.string().trim().min(5).max(2000),
  candidate: z.preprocess(value => value && typeof value === "object" && "blocks" in value
    ? { ...value, blocks: normalizeBlogBlocks(value.blocks) } : value, revisionContentSchema),
}).strict();
export type RevisionContent = z.infer<typeof revisionContentSchema>;

export function mapRevisionSource(row: Record<string, unknown>) {
  const data = revisionContentSchema.parse({ title: row.title, subtitle: row.subtitle, excerpt: row.excerpt, category: row.category, tags: row.tags, blocks: row.content });
  return { ...data, slug: z.string().parse(row.slug), revision: z.uuid().parse(row.revision), updatedAt: z.string().parse(row.updated_at),
    published: z.boolean().parse(row.published), date: z.string().parse(row.date), dateModified: row.date_modified ?? null, source: "supabase" as const };
}

export function revisionReadTime(content: RevisionContent): string {
  const text = content.blocks.map(block => {
    switch (block.type) {
      case "paragraph": case "heading": return block.text;
      case "faq": return block.question + block.answer;
      case "list": return block.items.join("");
      case "table": return block.headers.join("") + block.rows.flat().join("");
      case "image": return block.hidden ? "" : block.caption ?? "";
      case "relatedLinks": return block.items.map(item => item.title + item.href + (item.description ?? "")).join("");
      case "researchCallout": return block.title + block.description + block.href + block.linkText;
    }
  }).join("");
  return `${Math.max(1, Math.ceil(text.length / 500))}분`;
}
