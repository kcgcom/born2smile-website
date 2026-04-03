"use client";

import { useState, useEffect } from "react";
import { Pencil, Calendar, Check, FileEdit } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { getAccessToken } from "@/lib/supabase";
import { usePublishPopup } from "@/hooks/usePublishPopup";
import { PublishPopup } from "./PublishPopup";

interface AdminDraftBarProps {
  slug: string;
}

/**
 * 초안 포스트 전용 하단 플로팅 액션 바.
 * 관리자 + draft 포스트일 때만 표시.
 * 수정 링크 + 발행 예약 팝업을 제공.
 */
export function AdminDraftBar({ slug }: AdminDraftBarProps) {
  const isAdmin = useAdminAuth();
  const [isDraft, setIsDraft] = useState<boolean | null>(null);
  const [publishedDate, setPublishedDate] = useState<string | null>(null);

  const popup = usePublishPopup({
    onPublished: (_slug, date) => {
      setPublishedDate(date);
      setIsDraft(false);
    },
  });

  // Check if post is draft
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/admin/blog-posts/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const post = json.data ?? json;
        setIsDraft(post.published === false);
      } catch {
        // silently ignore — bar simply won't appear
      }
    })();
  }, [isAdmin, slug]);

  if (!isAdmin || isDraft !== true) return null;

  // 발행 완료 후 확인 메시지
  if (publishedDate) {
    return (
      <div className="fixed right-0 bottom-16 left-0 z-50 px-3 py-3 md:px-4 md:bottom-4">
        <AdminSurface
          tone="success"
          className="mx-auto flex max-w-5xl items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-semibold"
        >
          <Check size={16} />
          발행 예약됨 ({publishedDate})
        </AdminSurface>
      </div>
    );
  }

  return (
    <>
      {/* 플로팅 바 */}
      <div className="fixed right-0 bottom-16 left-0 z-50 px-3 py-3 md:px-4 md:bottom-4">
        <AdminSurface
          tone="dark"
          className="mx-auto flex max-w-5xl flex-col items-stretch gap-3 rounded-[1.35rem] border-amber-300/25 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92))] px-4 py-3"
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AdminPill tone="amber" className="gap-2 text-xs">
                  <FileEdit size={14} className="text-amber-200" aria-hidden="true" />
                  초안 관리
                </AdminPill>
                <AdminPill tone="slate" className="hidden sm:inline-flex">
                  비공개 상태
                </AdminPill>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-100">
                이 포스트는 아직 공개되지 않았습니다.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                수정 후 발행 버튼으로 즉시 공개하거나 예약 발행을 설정할 수 있습니다.
              </p>
            </div>
            <AdminPill tone="slate" className="shrink-0 sm:hidden">
              비공개
            </AdminPill>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2">
            <AdminActionLink
              href={`/admin?tab=content&sub=posts&edit=${slug}`}
              tone="ghost"
              className="min-h-11"
            >
              <Pencil size={14} aria-hidden="true" />
              수정
            </AdminActionLink>
            <AdminActionButton
              onClick={() => popup.open(slug)}
              tone="primary"
              className="min-h-11"
            >
              <Calendar size={14} aria-hidden="true" />
              발행
            </AdminActionButton>
          </div>
        </AdminSurface>
      </div>

      {/* 발행 팝업 */}
      {popup.publishingSlug && (
        <PublishPopup
          publishDate={popup.publishDate}
          publishMode={popup.publishMode}
          scheduledDate={popup.scheduledDate}
          publishing={popup.publishing}
          today={popup.today}
          error={popup.error}
          onModeChange={(mode) => {
            popup.setPublishMode(mode);
            if (mode === "schedule") popup.setPublishDate(popup.scheduledDate);
            else if (mode === "immediate") popup.setPublishDate(popup.today);
          }}
          onDateChange={popup.setPublishDate}
          onConfirm={popup.confirm}
          onClose={popup.close}
        />
      )}
    </>
  );
}
