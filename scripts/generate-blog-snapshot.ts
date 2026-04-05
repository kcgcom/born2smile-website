import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../lib/blog/generated/posts-snapshot.ts");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadLocalEnv() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
}

interface SnapshotRow {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  date_modified: string | null;
  content: unknown[];
  read_time: string | null;
  reviewed_date: string | null;
  published: boolean;
}

function calculateReadTimeFromBlocks(blocks: unknown[]): string {
  const totalChars = blocks.reduce<number>((sum, item) => {
    if (!item || typeof item !== "object") return sum;
    const entry = item as Record<string, unknown>;

    switch (entry.type) {
      case "heading":
      case "paragraph":
        return sum + (typeof entry.text === "string" ? entry.text.length : 0);
      case "list":
        return sum + (Array.isArray(entry.items) ? entry.items.reduce<number>((acc, value) => acc + (typeof value === "string" ? value.length : 0), 0) : 0);
      case "faq":
        return sum
          + (typeof entry.question === "string" ? entry.question.length : 0)
          + (typeof entry.answer === "string" ? entry.answer.length : 0);
      case "relatedLinks":
        return sum + (Array.isArray(entry.items)
          ? entry.items.reduce<number>((acc, value) => {
              if (!value || typeof value !== "object") return acc;
              const link = value as Record<string, unknown>;
              return acc
                + (typeof link.title === "string" ? link.title.length : 0)
                + (typeof link.href === "string" ? link.href.length : 0)
                + (typeof link.description === "string" ? link.description.length : 0);
            }, 0)
          : 0);
      default:
        return sum;
    }
  }, 0);

  return `${Math.max(1, Math.ceil(totalChars / 500))}분`;
}

function buildOutput(rows: SnapshotRow[]) {
  const normalized = rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt,
    category: row.category,
    tags: row.tags ?? [],
    date: row.date,
    dateModified: row.date_modified ?? undefined,
    blocks: row.content ?? [],
    readTime: row.read_time ?? calculateReadTimeFromBlocks(row.content ?? []),
    reviewedDate: row.reviewed_date ?? undefined,
    published: row.published,
  }));

  return `// =============================================================
// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 실행: pnpm generate-blog-snapshot
// =============================================================

export interface BlogSnapshotPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  dateModified?: string;
  blocks: unknown[];
  readTime: string;
  reviewedDate?: string;
  published: boolean;
}

export const BLOG_POSTS_SNAPSHOT: BlogSnapshotPost[] = ${JSON.stringify(normalized, null, 2)};
`;
}

async function main() {
  loadLocalEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    if (fs.existsSync(outFile)) {
      console.warn("⚠ Supabase 환경변수가 없어 기존 blog snapshot 파일을 유지합니다.");
      return;
    }

    const emptyOutput = `// =============================================================
// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 실행: pnpm generate-blog-snapshot
// =============================================================

export interface BlogSnapshotPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  dateModified?: string;
  blocks: unknown[];
  readTime: string;
  reviewedDate?: string;
  published: boolean;
}

export const BLOG_POSTS_SNAPSHOT: BlogSnapshotPost[] = [];
`;
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, emptyOutput, "utf8");
    console.warn("⚠ Supabase 환경변수가 없어 빈 blog snapshot 파일을 생성했습니다.");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, subtitle, excerpt, category, tags, date, date_modified, content, read_time, reviewed_date, published")
    .order("date", { ascending: false });

  if (error) {
    if (fs.existsSync(outFile)) {
      console.warn(`⚠ Snapshot 갱신 실패(${error.message}). 기존 blog snapshot 파일을 유지합니다.`);
      return;
    }
    throw error;
  }

  const output = buildOutput((data ?? []) as SnapshotRow[]);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, output, "utf8");
  console.log(`Generated blog snapshot for ${(data ?? []).length} posts → lib/blog/generated/posts-snapshot.ts`);
}

main().catch((error) => {
  console.error("Failed to generate blog snapshot:", error);
  process.exit(1);
});
