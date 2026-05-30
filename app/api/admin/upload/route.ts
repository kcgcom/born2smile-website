import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import sharp from "sharp";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeBlogCategory } from "@/lib/blog/category-slugs";

const BUCKET = "blog-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const WEBP_SIZE = 1200;
const WEBP_QUALITY = 90;
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const HEADERS = { "Cache-Control": "private, no-store" } as const;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/;

interface PreparedImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
  width?: number;
  height?: number;
  size: number;
  optimized: boolean;
}

function buildUploadPath(ext: string, formData: FormData): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;

  const category = normalizeBlogCategory(String(formData.get("category") ?? ""));
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  if (category && SLUG_RE.test(slug)) {
    return `blog/${category}/${slug}/${filename}`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `blog/_library/${year}/${month}/${filename}`;
}

async function prepareImage(file: File): Promise<PreparedImage> {
  const input = Buffer.from(await file.arrayBuffer());

  if (file.type === "image/gif") {
    const metadata = await sharp(input, { animated: true }).metadata();
    return {
      buffer: input,
      contentType: file.type,
      ext: EXT_MAP[file.type],
      width: metadata.width,
      height: metadata.height,
      size: input.byteLength,
      optimized: false,
    };
  }

  const buffer = await sharp(input)
    .rotate()
    .resize(WEBP_SIZE, WEBP_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    contentType: "image/webp",
    ext: "webp",
    width: WEBP_SIZE,
    height: WEBP_SIZE,
    size: buffer.byteLength,
    optimized: true,
  };
}

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
    const image = await prepareImage(file);
    const path = buildUploadPath(image.ext, formData);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, image.buffer, { contentType: image.contentType, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return Response.json({
      data: {
        url: publicUrl,
        path,
        width: image.width,
        height: image.height,
        size: image.size,
        contentType: image.contentType,
        optimized: image.optimized,
      },
    }, { headers: HEADERS });
  } catch (error) {
    Sentry.captureException(error);
    return Response.json(
      { error: "API_ERROR", message: "이미지 업로드에 실패했습니다" },
      { status: 500, headers: HEADERS },
    );
  }
}
