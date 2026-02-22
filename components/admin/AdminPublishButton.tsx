"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getFirebaseAuth } from "@/lib/firebase";
import { usePublishPopup } from "@/hooks/usePublishPopup";
import { PublishPopup } from "./PublishPopup";

interface AdminPublishButtonProps {
  slug: string;
}

/**
 * 관리자에게만 보이는 발행 예약 버튼.
 * draft(published=false) 포스트일 때만 표시.
 * 블로그 상세 페이지 헤더에서 사용.
 */
export function AdminPublishButton({ slug }: AdminPublishButtonProps) {
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
        // silently ignore — button simply won't appear
      }
    })();
  }, [isAdmin, slug]);

  if (!isAdmin || isDraft !== true) return null;

  if (publishedDate) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white">
        <Calendar size={14} aria-hidden="true" />
        발행 예약됨 ({publishedDate})
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => popup.open(slug)}
        className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        aria-label="발행 예약"
      >
        <Calendar size={14} aria-hidden="true" />
        발행 예약
      </button>

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
