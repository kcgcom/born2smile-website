import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { revalidateBlogCaches } from "@/app/api/admin/_lib/blog-cache";
import { normalizeBlogCategory } from "@/lib/blog/category-slugs";
import { BLOG_CATEGORY_LABELS_LIST, BLOG_CATEGORY_SLUGS } from "@/lib/blog/types";
import { expireSiteConfigCache } from "@/lib/site-config-supabase";

const blogRecord = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/),
  category: z.enum([...BLOG_CATEGORY_SLUGS, ...BLOG_CATEGORY_LABELS_LIST])
    .transform((value) => normalizeBlogCategory(value) ?? undefined),
  published: z.boolean(),
});

const configRecord = z.object({
  type: z.enum(["links", "clinic", "hours", "schedule"]),
});

const eventSchema = z.object({
  schema: z.literal("public"),
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.enum(["blog_posts", "site_config"]),
  record: z.unknown(),
  old_record: z.unknown(),
});

export async function POST(request: Request) {
  const secret = process.env.DATABASE_WEBHOOK_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization || !timingSafeEqual(
    createHash("sha256").update(authorization).digest(),
    createHash("sha256").update(`Bearer ${secret}`).digest(),
  )) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = eventSchema.safeParse(await request.json().catch(() => null));
  if (!event.success) {
    return Response.json({ error: "Invalid database event" }, { status: 400 });
  }

  const { type, table, record, old_record: oldRecord } = event.data;
  const records = type === "INSERT" ? [record] : type === "DELETE" ? [oldRecord] : [oldRecord, record];

  if (table === "blog_posts") {
    const rows = blogRecord.array().safeParse(records);
    if (!rows.success) {
      return Response.json({ error: "Invalid blog record" }, { status: 400 });
    }

    if (rows.data.some((row) => row.published)) {
      revalidateBlogCaches(rows.data, { expire: 0 });
      revalidatePath("/feed.xml");
    }
  } else {
    const rows = configRecord.array().safeParse(records);
    if (!rows.success) {
      return Response.json({ error: "Invalid site config record" }, { status: 400 });
    }

    const configTypes = new Set(rows.data.map((row) => row.type));
    for (const configType of configTypes) {
      expireSiteConfigCache(configType);
    }
    if (rows.data.some((row) => row.type !== "schedule")) {
      revalidatePath("/", "layout");
      revalidatePath("/llms.txt");
    }
  }

  return new Response(null, { status: 204 });
}
