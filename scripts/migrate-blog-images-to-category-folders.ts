import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeBlogCategory } from "../lib/blog/category-slugs";
import type { BlogBlock } from "../lib/blog/types";

const BUCKET = "blog-images";
const TABLE = "blog_posts";
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;

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

interface BlogRow {
  slug: string;
  category: string;
  content: unknown[];
}

interface ImageMove {
  slug: string;
  oldPath: string;
  newPath: string;
  oldUrl: string;
  newUrl: string;
}

function getStoragePathFromPublicUrl(src: string): string | null {
  try {
    const url = new URL(src);
    const markerIndex = url.pathname.indexOf(PUBLIC_PATH_MARKER);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + PUBLIC_PATH_MARKER.length));
  } catch {
    return null;
  }
}

function isImageBlock(block: BlogBlock): block is Extract<BlogBlock, { type: "image" }> {
  return block.type === "image";
}

function getTargetPath(category: string, slug: string, oldPath: string): string {
  const filename = oldPath.split("/").pop();
  if (!filename) throw new Error(`Invalid storage path: ${oldPath}`);
  return `blog/${category}/${slug}/${filename}`;
}

async function main() {
  loadLocalEnv();

  const apply = process.argv.includes("--apply");
  const deleteOld = process.argv.includes("--delete-old");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from(TABLE)
    .select("slug, category, content")
    .order("date", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as BlogRow[];
  const moves: ImageMove[] = [];
  const updatedRows: { slug: string; content: BlogBlock[] }[] = [];

  for (const row of rows) {
    const category = normalizeBlogCategory(row.category);
    if (!category || !Array.isArray(row.content)) continue;

    let changed = false;
    const nextContent = row.content.map((block) => {
      if (!block || typeof block !== "object" || !("type" in block)) return block as BlogBlock;
      const typedBlock = block as BlogBlock;
      if (!isImageBlock(typedBlock)) return typedBlock;

      const oldPath = getStoragePathFromPublicUrl(typedBlock.src);
      if (!oldPath?.startsWith("blog/")) return typedBlock;

      const newPath = getTargetPath(category, row.slug, oldPath);
      if (oldPath === newPath) return typedBlock;

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
      moves.push({
        slug: row.slug,
        oldPath,
        newPath,
        oldUrl: typedBlock.src,
        newUrl: publicUrl,
      });
      changed = true;
      return { ...typedBlock, src: publicUrl };
    });

    if (changed) {
      updatedRows.push({ slug: row.slug, content: nextContent as BlogBlock[] });
    }
  }

  const uniqueMoves = Array.from(
    new Map(moves.map((move) => [`${move.oldPath}=>${move.newPath}`, move])).values(),
  );

  console.log(`Found ${uniqueMoves.length} image object move(s) across ${updatedRows.length} post(s).`);
  for (const move of uniqueMoves) {
    console.log(`- ${move.slug}: ${move.oldPath} -> ${move.newPath}`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to copy objects and update blog_posts.content.");
    return;
  }

  for (const move of uniqueMoves) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(move.oldPath);
    if (downloadError) throw downloadError;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(move.newPath, await blob.arrayBuffer(), {
        contentType: blob.type || undefined,
        upsert: true,
      });
    if (uploadError) throw uploadError;
  }

  for (const row of updatedRows) {
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({
        content: row.content,
        updated_at: new Date().toISOString(),
        updated_by: "image-folder-migration",
      })
      .eq("slug", row.slug);

    if (updateError) throw updateError;
  }

  if (deleteOld) {
    const oldPaths = Array.from(new Set(uniqueMoves.map((move) => move.oldPath)));
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(oldPaths);
    if (removeError) throw removeError;
    console.log(`Deleted ${oldPaths.length} old object(s).`);
  }

  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
