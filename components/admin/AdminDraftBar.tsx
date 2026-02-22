"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pencil, Calendar, Check, FileEdit } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getFirebaseAuth } from "@/lib/firebase";
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
        const user = getFirebaseAuth().currentUser;
        if (!user) return;
        const token = await user.getIdToken();
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
      <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-green-200 bg-green-50 px-4 py-3 md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-sm font-medium text-green-700">
          <Check size={16} />
          발행 예약됨 ({publishedDate})
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 플로팅 바 */}
      <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-amber-200 bg-amber-50/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit size={16} className="text-amber-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-amber-800">초안</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin?tab=blog&edit=${slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Pencil size={14} aria-hidden="true" />
              수정
            </Link>
            <button
              onClick={() => popup.open(slug)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              <Calendar size={14} aria-hidden="true" />
              발행
            </button>
          </div>
        </div>
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
