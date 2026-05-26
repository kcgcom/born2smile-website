import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAllPostDetailsFresh } from "@/lib/blog-supabase";
import type { BlogBlock, BlogCategoryValue } from "@/lib/blog/types";
import { getTodayKST } from "@/lib/date";

const BUCKET = "blog-images";
const HEADERS = { "Cache-Control": "private, no-store" } as const;
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;

interface ImageUsage {
  slug: string;
  title: string;
  category: BlogCategoryValue;
  published: boolean;
  hidden: boolean;
  visible: boolean;
}

interface ImageItem {
  path: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
  usage: ImageUsage[];
  isVisible: boolean;
  isUsed: boolean;
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

async function getImageUsageMap(): Promise<Map<string, ImageUsage[]>> {
  const today = getTodayKST();
  const posts = await getAllPostDetailsFresh();
  const usageMap = new Map<string, ImageUsage[]>();

  for (const post of posts) {
    for (const block of post.blocks) {
      if (!isImageBlock(block)) continue;

      const path = getStoragePathFromPublicUrl(block.src);
      if (!path?.startsWith("blog/")) continue;

      const hidden = block.hidden ?? false;
      const visible = post.published && post.date <= today && !hidden;
      const usage: ImageUsage = {
        slug: post.slug,
        title: post.title,
        category: post.category,
        published: post.published,
        hidden,
        visible,
      };

      usageMap.set(path, [...(usageMap.get(path) ?? []), usage]);
    }
  }

  return usageMap;
}

async function listImages(prefix: string, depth = 0): Promise<ImageItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw error;

  const items = await Promise.all(
    (data ?? []).map(async (item) => {
      const path = `${prefix}/${item.name}`;

      if (item.id === null) {
        if (depth >= 4) return [];
        return listImages(path, depth + 1);
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return [{
        path,
        name: item.name,
        url: publicUrl,
        size: item.metadata?.size ?? 0,
        createdAt: item.created_at ?? "",
        usage: [],
        isVisible: false,
        isUsed: false,
      }];
    }),
  );

  return items.flat();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const [images, usageMap] = await Promise.all([
      listImages("blog"),
      getImageUsageMap(),
    ]);
    const annotatedImages = images
      .map((image) => {
        const usage = usageMap.get(image.path) ?? [];
        return {
          ...image,
          usage,
          isVisible: usage.some((item) => item.visible),
          isUsed: usage.length > 0,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return Response.json({ data: annotatedImages }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "이미지 목록을 불러올 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const path = request.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("blog/")) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 경로입니다" },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const { error } = await getSupabaseAdmin().storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return Response.json({ data: { path } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "이미지를 삭제할 수 없습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
