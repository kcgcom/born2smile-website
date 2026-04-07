"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import type { PageBriefItem } from "./shared";
import { PAGE_BRIEF_WORKNOTE_KEY } from "../blog/blog-editor-draft";
import { PageBriefPanel } from "./strategy-panels";

export function PageBriefWorkspace() {
  const [brief] = useState<PageBriefItem | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(PAGE_BRIEF_WORKNOTE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PageBriefItem;
    } catch {
      return null;
    }
  });

  if (!brief) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">페이지 개편 워크노트</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          전략 탭의 페이지 개편 브리프에서 “개편 워크노트 열기”를 눌러야 내용이 채워집니다.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          이 화면은 브리프를 임시 저장해 여는 구조라서 새로고침하거나 직접 주소로 들어오면 내용이 비어 있을 수 있습니다.
        </p>
        <div className="mt-4">
          <AdminActionLink tone="dark" href="/admin/content/strategy">
            <ArrowLeft className="h-4 w-4" />
            콘텐츠 전략으로 돌아가기
          </AdminActionLink>
        </div>
      </AdminSurface>
    );
  }

  return <PageBriefPanel brief={brief} />;
}
