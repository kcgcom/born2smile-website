"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Copy, Trash2, Check, Upload, X } from "lucide-react";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";

interface ImageItem {
  path: string;
  name: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
  usage: {
    slug: string;
    title: string;
    category: string;
    published: boolean;
    hidden: boolean;
    visible: boolean;
  }[];
  isVisible: boolean;
  isUsed: boolean;
}

type ImageFilter = "all" | "used" | "unused";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0B";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatImageMeta(image: Pick<ImageItem, "format" | "width" | "height">): string {
  const parts: string[] = [];
  if (image.format) parts.push(image.format.toUpperCase());
  if (image.width && image.height) parts.push(`${image.width}×${image.height}`);
  return parts.join(" · ");
}

function getUsageLabel(usage: ImageItem["usage"][number]): string {
  if (usage.visible) return "공개";
  if (usage.hidden) return "숨김";
  return usage.published ? "예약" : "초안";
}

export function ImagesSubTab() {
  const { data, loading, error, refetch } = useAdminApi<ImageItem[]>("/api/admin/images");
  const { mutate } = useAdminMutation<{ path: string }>();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>("all");
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  const handleCopy = useCallback((url: string, path: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    });
  }, []);

  const handleDelete = useCallback(async (image: ImageItem) => {
    if (
      image.isUsed &&
      !confirm("이 이미지를 삭제하면 해당 이미지를 사용 중인 포스트에서도 표시되지 않습니다. 삭제할까요?")
    ) {
      return;
    }

    setDeletingPath(image.path);
    await mutate(`/api/admin/images?path=${encodeURIComponent(image.path)}`, "DELETE");
    setDeletingPath(null);
    refetch();
  }, [mutate, refetch]);

  const handleUpload = useCallback(async (file: File) => {
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
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const json = await res.json() as { message?: string };
        setUploadError(json.message ?? "업로드 실패");
        return;
      }
      refetch();
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  }, [refetch]);

  const images = useMemo(() => data ?? [], [data]);
  const usedCount = useMemo(() => images.filter((img) => img.isUsed).length, [images]);
  const unusedCount = images.length - usedCount;
  const filteredImages = useMemo(() => {
    if (filter === "used") return images.filter((img) => img.isUsed);
    if (filter === "unused") return images.filter((img) => !img.isUsed);
    return images;
  }, [filter, images]);

  const filterOptions: { value: ImageFilter; label: string; count: number }[] = [
    { value: "all", label: "전체", count: images.length },
    { value: "used", label: "사용 중", count: usedCount },
    { value: "unused", label: "미사용", count: unusedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <AdminSurface tone="white" className="rounded-2xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">이미지 라이브러리</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              JPG · PNG · WebP는 1200×1200 WebP로 자동 최적화되고 GIF는 원본으로 보관됩니다.
            </p>
          </div>
          <label className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity ${uploading ? "cursor-not-allowed bg-gray-400" : "bg-[var(--color-primary)] hover:opacity-90"}`}>
            <Upload size={15} />
            {uploading ? "업로드 중…" : "이미지 업로드"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
      </AdminSurface>

      {/* Image grid */}
      {loading && <AdminLoadingSkeleton variant="full" />}
      {!loading && error && <AdminErrorState message={error} onRetry={refetch} />}

      {!loading && !error && images.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center text-sm text-[var(--muted)]">
          아직 업로드된 이미지가 없습니다.
        </div>
      )}

      {!loading && !error && images.length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                  ].join(" ")}
                >
                  {option.label} {option.count.toLocaleString("ko-KR")}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)]">
              사용 중 {usedCount.toLocaleString("ko-KR")}개 · 미사용 {unusedCount.toLocaleString("ko-KR")}개
            </p>
          </div>

          {filteredImages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--muted)]">
              이 조건에 해당하는 이미지가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredImages.map((img) => (
                <div
                  key={img.path}
                  className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm"
                >
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(img)}
                    className="flex h-36 w-full cursor-zoom-in items-center justify-center bg-[var(--background)] p-2 transition-colors hover:bg-slate-100"
                    aria-label={`${img.name} 크게 보기`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>

                  {/* Info */}
                  <div className="border-t border-[var(--border)] px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          img.isUsed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {img.isUsed ? "사용 중" : "미사용"}
                      </span>
                      {img.isUsed && !img.isVisible && (
                        <span className="text-[10px] text-amber-600">비공개/숨김</span>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium text-[var(--foreground)]" title={img.name}>
                      {img.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      {[formatBytes(img.size), formatImageMeta(img), formatDate(img.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                  {img.usage.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {img.usage.slice(0, 2).map((item) => (
                        <Link
                          key={`${img.path}-${item.slug}`}
                          href={`/blog/${item.category}/${item.slug}`}
                          className="block truncate text-[10px] text-[var(--color-primary)] hover:underline"
                          title={`${item.title} (${getUsageLabel(item)})`}
                        >
                          {item.title} · {getUsageLabel(item)}
                        </Link>
                      ))}
                      {img.usage.length > 2 && (
                        <p className="text-[10px] text-[var(--muted)]">
                          외 {img.usage.length - 2}개 글
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 truncate text-[10px] text-[var(--muted)]" title={img.path}>
                      사용 중인 포스트 없음
                    </p>
                  )}
                </div>

                  {/* Actions */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleCopy(img.url, img.path)}
                      title="URL 복사"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white"
                    >
                      {copiedPath === img.path
                        ? <Check size={13} className="text-green-500" />
                        : <Copy size={13} className="text-[var(--foreground)]" />
                      }
                    </button>
                    <button
                      onClick={() => void handleDelete(img)}
                      disabled={deletingPath === img.path}
                      title="삭제"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 shadow-sm backdrop-blur-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {previewImage.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {[formatBytes(previewImage.size), formatImageMeta(previewImage), previewImage.path].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="이미지 미리보기 닫기"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
