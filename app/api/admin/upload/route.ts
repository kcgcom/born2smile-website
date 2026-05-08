import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "blog-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "multipart/form-data 파싱 실패" },
      { status: 400, headers: HEADERS },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "file 필드가 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "jpg, png, webp, gif 파일만 업로드 가능합니다" },
      { status: 400, headers: HEADERS },
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: "BAD_REQUEST", message: "파일 크기는 5MB 이하여야 합니다" },
      { status: 400, headers: HEADERS },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const ext = EXT_MAP[file.type] ?? "jpg";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `blog/${year}/${month}/${timestamp}-${random}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({ data: { url: publicUrl } }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "이미지 업로드에 실패했습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
