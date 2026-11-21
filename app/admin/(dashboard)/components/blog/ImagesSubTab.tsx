"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Copy, Trash2, Check, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminApi, useAdminMutation } from "@/app/admin/(dashboard)/components/useAdminApi";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { AdminErrorState } from "@/app/admin/(dashboard)/components/AdminErrorState";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";
import { useModalA11y } from "@/hooks/useModalA11y";

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

function UsageLinks({ usages }: { usages: ImageItem["usage"] }) {
  if (!usages.length) return <p className="text-xs text-slate-600">사용 중인 포스트 없음</p>;
  return <ul className="space-y-2">
    {usages.map(usage => {
      const category = encodeURIComponent(usage.category);
      const slug = encodeURIComponent(usage.slug);
      const href = usage.visible ? `/blog/${category}/${slug}`
        : usage.hidden ? `/admin/content/posts/${slug}` : `/admin/preview/${category}/${slug}`;
      const action = usage.visible ? "공개 글 보기" : usage.hidden ? "편집하기" : "미리보기";
      return <li key={usage.slug}>
        <Link href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 flex-col justify-center rounded-lg px-2 py-2 text-sm text-blue-800 underline focus-visible:outline-2 focus-visible:outline-blue-700">
          <span className="break-words">{usage.title}</span>
          <span className="mt-1 text-xs text-slate-600">{getUsageLabel(usage)} · {action} (새 창)</span>
        </Link>
      </li>;
    })}
  </ul>;
}

export function ImagesSubTab() {
  const { data, loading, error, refetch } = useAdminApi<ImageItem[]>("/api/admin/images");
  const { mutate } = useAdminMutation<{ path: string }>();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ImageFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{ path: string; width: number; height: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const deleteLock = useRef(false);
  const previewOpen = Boolean(previewImage);
  const previewMeta = previewImage && previewDimensions?.path === previewImage.path
    ? { ...previewImage, width: previewDimensions.width, height: previewDimensions.height }
    : previewImage;
  const closePreview = useCallback(() => setPreviewImage(null), []);

  const handleCopy = useCallback(async (url: string, path: string) => {
    setActionError(null);
    setActionNotice(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPath(path);
      setActionNotice("이미지 URL을 복사했습니다.");
    } catch {
      setActionError("URL을 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인한 뒤 다시 시도해 주세요.");
    }
  }, []);

  useEffect(() => {
    if (!copiedPath) return;
    const timer = window.setTimeout(() => setCopiedPath(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedPath]);

  const handleDelete = useCallback(async (image: ImageItem) => {
    if (deleteLock.current) return;
    const warning = image.isUsed ? "사용 중인 포스트에서도 이미지가 표시되지 않습니다. " : "";
    if (!confirm(`${image.name}\n${warning}이미지를 삭제할까요?`)) return;
    deleteLock.current = true;
    setActionError(null);
    setActionNotice(null);
    setDeletingPath(image.path);
    try {
      const result = await mutate(`/api/admin/images?path=${encodeURIComponent(image.path)}`, "DELETE");
      if (result.error) {
        setActionError(`이미지 삭제 실패: ${result.error}`);
        return;
      }
      setActionNotice(`${image.name} 이미지를 삭제했습니다.`);
      setPreviewImage(previous => previous?.path === image.path ? null : previous);
      refetch();
    } finally {
      deleteLock.current = false;
      setDeletingPath(null);
    }
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
    const search = query.trim().toLocaleLowerCase();
    return images.filter(img => (filter === "all" || (filter === "used" ? img.isUsed : !img.isUsed))
      && (!search || [img.name, img.path, ...img.usage.map(usage => usage.title)].some(value => value.toLocaleLowerCase().includes(search))))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "ko") : sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  }, [filter, images, query, sort]);

  const previewIndex = useMemo(
    () => (previewImage ? filteredImages.findIndex((img) => img.path === previewImage.path) : -1),
    [previewImage, filteredImages],
  );

  const goToPrev = useCallback(() => {
    if (previewIndex > 0) setPreviewImage(filteredImages[previewIndex - 1]);
  }, [previewIndex, filteredImages]);

  const goToNext = useCallback(() => {
    if (previewIndex < filteredImages.length - 1) setPreviewImage(filteredImages[previewIndex + 1]);
  }, [previewIndex, filteredImages]);

  useEffect(() => {
    if (!previewImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [previewImage, goToPrev, goToNext]);

  const modalRef = useModalA11y(closePreview, previewOpen);

  useEffect(() => {
    if (!previewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [previewOpen]);

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
          <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-700 ${uploading ? "cursor-not-allowed bg-[var(--muted)]" : "bg-[var(--color-primary)] hover:opacity-90"}`}>
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
        {uploadError && <p role="alert" className="mt-2 text-sm text-red-700">{uploadError}</p>}
      </AdminSurface>
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}
      {actionNotice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{actionNotice}</p>}

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
                  aria-pressed={filter === option.value}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === option.value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
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

          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="search" aria-label="이미지 검색" placeholder="파일명·경로·사용처 제목 검색" value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            <select aria-label="이미지 정렬" value={sort} onChange={event => setSort(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="name">파일명순</option></select>
            <button type="button" onClick={() => { setQuery(""); setFilter("all"); setSort("newest"); }} disabled={!query && filter === "all" && sort === "newest"} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm disabled:opacity-50">조건 초기화</button>
          </div>
          <p role="status" className="text-xs text-slate-600">{filteredImages.length.toLocaleString("ko-KR")}개 표시</p>
          {filteredImages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center text-sm text-[var(--muted)]">
              이 조건에 해당하는 이미지가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredImages.map((img) => (
                <div
                  key={img.path}
                  className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm"
                >
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(img)}
                    className="flex h-36 w-full cursor-zoom-in items-center justify-center bg-[var(--background)] p-2 transition-colors hover:bg-[var(--background)]"
                    aria-label={`${img.name} 크게 보기`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  </button>

                  {/* Info */}
                  <div className="border-t border-[var(--border)] px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                          img.isUsed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-[var(--background)] text-slate-500",
                        ].join(" ")}
                      >
                        {img.isUsed ? "사용 중" : "미사용"}
                      </span>
                      {img.isUsed && <span className="text-xs text-slate-600">{Array.from(new Set(img.usage.map(getUsageLabel))).join(" · ")}</span>}
                    </div>
                    <p className="truncate text-xs font-medium text-[var(--foreground)]" title={img.name}>
                      {img.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {[formatBytes(img.size), formatImageMeta(img), formatDate(img.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                    <details className="mt-2 text-xs text-slate-600">
                      <summary className="min-h-11 cursor-pointer py-3 font-medium">파일 정보·사용처</summary>
                      <p className="break-all font-medium text-slate-900">{img.name}</p>
                      <p className="mt-2 break-all">{img.path}</p>
                      <p className="my-2 leading-5">{[formatBytes(img.size), formatImageMeta(img), formatDate(img.createdAt)].filter(Boolean).join(" · ")}</p>
                      <UsageLinks usages={img.usage} />
                    </details>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto grid grid-cols-2 gap-1 border-t border-slate-200 p-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy(img.url, img.path)}
                      aria-label={img.name + " URL 복사"}
                      title="URL 복사"
                      className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-slate-200 text-xs hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {copiedPath === img.path
                        ? <Check size={13} className="text-green-500" />
                        : <Copy size={13} className="text-[var(--foreground)]" />
                      }
                      {copiedPath === img.path ? "복사됨" : "복사"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(img)}
                      aria-label={img.name + " 삭제"}
                      disabled={deletingPath !== null}
                      title="삭제"
                      className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-red-200 text-xs text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      {deletingPath === img.path ? "삭제 중" : "삭제"}
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
            ref={modalRef}
            className="relative flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-y-auto rounded-2xl bg-[var(--background)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold text-[var(--foreground)]">
                  {previewImage.name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {[formatBytes(previewImage.size), formatImageMeta(previewMeta ?? previewImage)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {filteredImages.length > 1 && (
                  <span className="text-xs text-[var(--muted)]">
                    {previewIndex + 1} / {filteredImages.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                  aria-label="이미지 미리보기 닫기"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[var(--background)] p-4">
              {previewIndex > 0 && (
                <button
                  type="button"
                  onClick={goToPrev}
                  className="absolute left-3 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--background)]/90 shadow-md backdrop-blur-sm hover:bg-[var(--background)]"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={previewImage.path}
                src={previewImage.url}
                alt={previewImage.name}
                onLoad={({ currentTarget }) => setPreviewDimensions({
                  path: previewImage.path,
                  width: currentTarget.naturalWidth,
                  height: currentTarget.naturalHeight,
                })}
                className="max-h-[50dvh] max-w-full object-contain"
              />
              {previewIndex < filteredImages.length - 1 && (
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-3 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--background)]/90 shadow-md backdrop-blur-sm hover:bg-[var(--background)]"
                  aria-label="다음 이미지"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
            <div className="border-t border-slate-200 p-4">
              <p className="mb-3 break-all text-xs text-slate-600">{previewImage.path}</p>
              <h3 className="mb-2 text-sm font-semibold">사용 중인 포스트</h3>
              <UsageLinks usages={previewImage.usage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
