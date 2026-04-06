"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, FileText } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CategoryBadge } from "./shared";
import type { PageBriefItem } from "./shared";
import { PAGE_BRIEF_WORKNOTE_KEY } from "../blog/blog-editor-draft";

type StoredPageBrief = PageBriefItem;

function buildMarkdown(brief: StoredPageBrief): string {
  return [
    `# ${brief.subGroup} 페이지 개편 워크노트`,
    "",
    `- 대상 페이지: ${brief.targetPage}`,
    `- 히어로 카피: ${brief.heroCopy}`,
    `- 보조 카피: ${brief.supportingCopy}`,
    "",
    "## 수정 파일",
    ...brief.sourceFiles.map((file) => `- ${file}`),
    "",
    "## 추천 블록",
    ...brief.blocks.map((block) => `- ${block}`),
    "",
    "## FAQ 보강 질문",
    ...(brief.faqQuestions.length > 0
      ? brief.faqQuestions.map((question) => `- ${question}`)
      : ["- 추가 FAQ 없음"]),
    "",
    "## 수정 체크리스트",
    ...brief.checklist.map((item) => `- ${item}`),
    "",
    "## CTA 메모",
    `- ${brief.cta}`,
  ].join("\n");
}

export function PageBriefWorkspace() {
  const router = useRouter();
  const [brief] = useState<StoredPageBrief | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(PAGE_BRIEF_WORKNOTE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredPageBrief;
    } catch {
      window.sessionStorage.removeItem(PAGE_BRIEF_WORKNOTE_KEY);
      return null;
    }
  });
  const [notice, setNotice] = useState<string | null>(null);

  const markdown = useMemo(() => (brief ? buildMarkdown(brief) : ""), [brief]);

  const handleCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("페이지 개편 워크노트를 클립보드에 복사했습니다.");
    } catch {
      setNotice("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  if (!brief) {
    return (
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">페이지 개편 워크노트</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          전략 탭의 페이지 개편 브리프에서 “개편 워크노트 열기”를 눌러야 내용이 채워집니다.
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

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={brief.slug} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                페이지 개편 워크노트
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-[var(--foreground)]">{brief.subGroup}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{brief.heroCopy}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)]"
            >
              <Copy className="h-4 w-4" />
              워크노트 복사
            </button>
            <Link
              href={brief.targetPage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              <ExternalLink className="h-4 w-4" />
              대상 페이지 열기
            </Link>
            <button
              type="button"
              onClick={() => router.push("/admin/content/strategy")}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              <ArrowLeft className="h-4 w-4" />
              전략 탭으로
            </button>
          </div>
        </div>
        {notice && (
          <AdminNotice tone="success" className="mt-4">
            {notice}
          </AdminNotice>
        )}
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-[var(--foreground)]">개편 메모</h3>
          </div>
          <div className="mt-4 space-y-4 text-sm text-[var(--foreground)]">
            <section>
              <h4 className="font-semibold">보조 카피</h4>
              <p className="mt-1 text-[var(--muted)]">{brief.supportingCopy}</p>
            </section>
            <section>
              <h4 className="font-semibold">수정 파일</h4>
              <ul className="mt-2 space-y-2 text-[var(--muted)]">
                {brief.sourceFiles.map((file) => (
                  <li key={file}>• {file}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="font-semibold">추천 블록</h4>
              <ul className="mt-2 space-y-2 text-[var(--muted)]">
                {brief.blocks.map((block) => (
                  <li key={block}>• {block}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="font-semibold">수정 체크리스트</h4>
              <ul className="mt-2 space-y-2 text-[var(--muted)]">
                {brief.checklist.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h4 className="font-semibold">CTA 메모</h4>
              <p className="mt-1 text-[var(--muted)]">{brief.cta}</p>
            </section>
          </div>
        </AdminSurface>

        <AdminSurface tone="white" className="rounded-3xl p-6">
          <h3 className="text-lg font-bold text-[var(--foreground)]">FAQ 보강 질문</h3>
          <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            {brief.faqQuestions.length > 0 ? (
              brief.faqQuestions.map((question) => (
                <li key={question} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {question}
                </li>
              ))
            ) : (
              <li className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-3">
                아직 추천 FAQ 질문이 없습니다.
              </li>
            )}
          </ul>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">복사용 워크노트</h4>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-xs text-slate-600">
              {markdown}
            </pre>
          </div>
        </AdminSurface>
      </div>
    </div>
  );
}
