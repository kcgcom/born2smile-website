"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Bot, Copy, Database, ExternalLink, FileText, GitBranch, LineChart, ShieldCheck, X } from "lucide-react";
import { AdminActionLink, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CategoryBadge } from "./shared";
import type { PageBriefItem } from "./shared";

export const STRATEGY_RULE_SECTIONS = [
  {
    title: "1. 무엇을 기반으로 추천하나",
    icon: Database,
    bullets: [
      "Naver DataLab 검색 트렌드: 카테고리/서브그룹별 상대 지수 추이",
      "Naver SearchAd 검색량: 월간 절대 검색량 보정",
      "현재 발행된 블로그 포스트: 주제별 existingPostCount 계산",
      "치료 페이지/FAQ 정의 데이터: lib/treatments.ts, 키워드 taxonomy 기반 매핑",
    ],
  },
  {
    title: "2. 어떻게 점수를 계산하나",
    icon: LineChart,
    bullets: [
      "gapScore: 검색량 + 콘텐츠 부족도 + 트렌드 보너스를 합산해 새 글 필요도를 계산",
      "pageUpdateScore: 검색 의도, 검색량, FAQ 커버리지 부족, 추세를 합산해 페이지 보강 우선순위를 계산",
      "businessValue: 비용/보험/기간/대상/추천 등 전환 가치가 높은 키워드에 higher weight 부여",
      "segment/seasonality: device/gender/ages 필터와 장기 월별 패턴으로 모멘텀 힌트를 계산",
    ],
  },
  {
    title: "3. 액션 타입은 어떻게 정하나",
    icon: GitBranch,
    bullets: [
      "정보형 + 포스트 부족 → new-post",
      "비교/검토형 또는 pageUpdateScore 높음 → update-service-page",
      "질문성 키워드 강함 → expand-faq",
      "전환형 + 모멘텀 강함 → strengthen-cta",
      "계절성 키워드 포함 → seasonal-campaign",
    ],
  },
  {
    title: "4. 자동 생성 브리프는 어떻게 만들어지나",
    icon: FileText,
    bullets: [
      "블로그 브리프: 대표 키워드, 검색 의도, 독자 유형, outline, meta description, CTA를 템플릿으로 생성",
      "페이지 브리프: hero/supporting copy, recommended blocks, FAQ 보강 질문, CTA, sourceFiles, checklist 생성",
      "브리프 목록은 overview API 응답 시점마다 다시 계산되며 별도 DB 저장은 하지 않음",
      "브리프에서 버튼을 누른 순간 sessionStorage에 스냅샷을 저장해 handoff함",
    ],
  },
  {
    title: "5. AI와의 관계",
    icon: Bot,
    bullets: [
      "현재 추천 엔진은 AI 호출 없이 동작하는 규칙 기반 시스템",
      "빠르고 비용이 없고, 같은 입력에는 같은 출력이 나오는 것이 장점",
      "따라서 실시간 추천은 deterministic하며 관리자 새로고침/기간 변경 시 재계산됨",
      "향후 원하면 이 브리프를 AI 초안 생성기로 넘기는 구조로 확장 가능",
    ],
  },
  {
    title: "6. 해석 시 주의점",
    icon: ShieldCheck,
    bullets: [
      "DataLab 값은 절대 검색량이 아니라 상대 지수이므로 market size처럼 읽으면 안 됨",
      "segment/seasonality 카드는 힌트이며, 실제 전환 판단은 Search Console/GA4와 함께 봐야 함",
      "브리프는 초안이므로 의료 표현, 비용 표현, 과장 문구는 사람이 최종 검수해야 함",
      "페이지 보강 워크노트는 자동 수정이 아니라 코드 수정 handoff를 위한 문서임",
    ],
  },
] as const;

export function buildPageBriefMarkdown(brief: PageBriefItem): string {
  return [
    `# ${brief.subGroup} 페이지 보강 워크노트`,
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
    ...(brief.faqQuestions.length > 0 ? brief.faqQuestions.map((question) => `- ${question}`) : ["- 추가 FAQ 없음"]),
    "",
    "## 수정 체크리스트",
    ...brief.checklist.map((item) => `- ${item}`),
    "",
    "## CTA 메모",
    `- ${brief.cta}`,
  ].join("\n");
}

export function StrategyRulesPanel({
  embedded = false,
  onClose,
}: {
  embedded?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-4">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">추천 원리</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              갭 점수, 실행 추천, 자동 생성 브리프가 어떤 데이터와 규칙으로 만들어지는지 요약합니다.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              지금 시스템은 규칙 기반 추천입니다. 빠르고 일관되지만, 의료 표현과 최종 문구는 사람이 꼭 검수해야 합니다.
            </p>
          </div>
          {embedded ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] sm:w-auto"
            >
              <X className="h-4 w-4" />
              닫기
            </button>
          ) : (
            <AdminActionLink tone="dark" href="/admin/content/strategy">
              <ArrowLeft className="h-4 w-4" />
              전략 화면으로 돌아가기
            </AdminActionLink>
          )}
        </div>
      </AdminSurface>

      <div className="grid gap-4 xl:grid-cols-2">
        {STRATEGY_RULE_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <AdminSurface key={section.title} tone="white" className="rounded-3xl p-6">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-base font-bold text-[var(--foreground)]">{section.title}</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </AdminSurface>
          );
        })}
      </div>
    </div>
  );
}

export function PageBriefPanel({
  brief,
  embedded = false,
  onClose,
}: {
  brief: PageBriefItem;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const markdown = useMemo(() => buildPageBriefMarkdown(brief), [brief]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setNotice("페이지 보강 워크노트를 클립보드에 복사했습니다.");
    } catch {
      setNotice("클립보드 복사에 실패했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={brief.slug} />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                페이지 보강 워크노트
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-[var(--foreground)]">{brief.subGroup}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{brief.heroCopy}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] sm:w-auto"
            >
              <Copy className="h-4 w-4" />
              워크노트 복사
            </button>
            <Link
              href={brief.targetPage}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              대상 페이지 열기
            </Link>
            {embedded && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] sm:w-auto"
              >
                <X className="h-4 w-4" />
                닫기
              </button>
            )}
          </div>
        </div>
        {notice && (
          <AdminNotice tone="success" className="mt-4">
            {notice}
          </AdminNotice>
        )}
        <p className="mt-4 text-xs text-[var(--muted)]">
          이 워크노트는 브리프에서 넘어온 임시 메모입니다. 복사한 뒤 실제 페이지 보강 작업으로 이어가세요.
        </p>
      </AdminSurface>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminSurface tone="white" className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-lg font-bold text-[var(--foreground)]">보강 메모</h3>
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
