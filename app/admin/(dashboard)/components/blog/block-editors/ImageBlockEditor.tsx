"use client";

import { useState } from "react";
import type { BlogBlock, BlogCategorySlug } from "@/lib/blog/types";
import { getAccessToken } from "@/lib/supabase";
import { inputClass } from "./shared";

interface UploadResponseData {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  contentType?: string;
  optimized?: boolean;
}

export function ImageBlockEditor({
  block,
  idx,
  setBlock,
  hasError,
  uploadContext,
}: {
  block: Extract<BlogBlock, { type: "image" }>;
  idx: number;
  setBlock: (idx: number, block: BlogBlock) => void;
  hasError: boolean;
  uploadContext: { category: BlogCategorySlug; slug: string };
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("파일 크기는 5MB 이하여야 합니다");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const token = await getAccessToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", uploadContext.category);
      fd.append("slug", uploadContext.slug);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json() as { data?: UploadResponseData; message?: string };
      if (!res.ok) {
        setUploadError(json.message ?? "업로드 실패");
        return;
      }
      setBlock(idx, {
        ...block,
        src: json.data!.url,
        ...(json.data?.width && json.data?.height
          ? { width: json.data.width, height: json.data.height }
          : {}),
      });
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleUpload(file);
        }}
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 text-sm transition-colors",
          dragging
            ? "border-[var(--color-primary)] bg-blue-50"
            : "border-[var(--border)] bg-[var(--background)]",
        ].join(" ")}
      >
        {uploading ? (
          <span className="text-[var(--muted)]">최적화 중…</span>
        ) : (
          <>
            <span className="text-[var(--muted)]">파일을 드래그하거나</span>
            <label className="cursor-pointer rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
              파일 선택
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-xs text-[var(--muted)]">JPG · PNG · WebP는 1200×1200 WebP로 자동 최적화 · GIF는 원본 유지 · 최대 5MB</span>
          </>
        )}
        {block.src && !uploading && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.src}
            alt={block.alt || "미리보기"}
            className="mt-2 max-h-40 rounded object-contain"
          />
        )}
      </div>
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      <input
        type="text"
        value={block.src}
        onChange={(e) => setBlock(idx, {
          ...block,
          src: e.target.value,
          width: undefined,
          height: undefined,
        })}
        placeholder="또는 이미지 URL 직접 입력"
        className={inputClass(hasError)}
        aria-label={`블록 ${idx + 1} 이미지 URL`}
      />
      <input
        type="text"
        value={block.alt}
        onChange={(e) => setBlock(idx, { ...block, alt: e.target.value })}
        placeholder={block.decorative ? "장식용 이미지는 비워둡니다" : "이미지 대체 텍스트 (정보성 이미지일 때 필수)"}
        disabled={block.decorative ?? false}
        className={inputClass(hasError)}
        aria-label={`블록 ${idx + 1} 이미지 대체 텍스트`}
      />
      <textarea
        value={block.caption ?? ""}
        onChange={(e) => setBlock(idx, { ...block, caption: e.target.value })}
        rows={2}
        placeholder="이미지 캡션 (선택)"
        className={`${inputClass(false)} resize-y`}
        aria-label={`블록 ${idx + 1} 이미지 캡션`}
      />
      <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={block.decorative ?? false}
          onChange={(e) => setBlock(idx, { ...block, decorative: e.target.checked, alt: e.target.checked ? "" : block.alt })}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        <span>장식용 이미지로 처리</span>
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={block.hidden ?? false}
          onChange={(e) => setBlock(idx, { ...block, hidden: e.target.checked })}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        <span>이 이미지를 본문에서 숨기기</span>
      </label>
    </div>
  );
}
