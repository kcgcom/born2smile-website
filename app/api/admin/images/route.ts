import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "blog-images";
const HEADERS = { "Cache-Control": "private, no-store" } as const;

interface ImageItem {
  path: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
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
      }];
    }),
  );

  return items.flat();
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  try {
    const images = (await listImages("blog")).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return Response.json({ data: images }, { headers: HEADERS });
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
