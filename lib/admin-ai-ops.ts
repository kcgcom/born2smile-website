import { getTodayKST } from "./date";
import { getAllPostMetas, getPostBySlug, updateBlogPost, type UpdateBlogPostData } from "./blog-supabase";
import { fetchGA4Data } from "./admin-analytics";
import { fetchSearchConsoleData } from "./admin-search-console";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "./supabase-admin";
import { CLINIC, TREATMENTS } from "./constants";
import { TREATMENT_DETAILS } from "./treatments";
import type {
  AiOpsActionType,
  AiOpsActivityItem,
  AiOpsBriefing,
  AiOpsBriefingPeriod,
  AiOpsBriefingPeriodType,
  AiOpsCandidate,
  AiOpsCandidateIssue,
  AiOpsRecommendedAction,
  AiOpsSuggestionListItem,
  AiOpsSuggestionStatus,
  AiOpsTargetOption,
  AiOpsSuggestionType,
  AiOpsTargetType,
} from "./admin-ai-ops-types";

const BRIEFINGS_TABLE = "ai_agent_briefings";
const SUGGESTIONS_TABLE = "ai_agent_suggestions";
const ACTIONS_TABLE = "ai_agent_actions";

const LLM_BASE_URL = ((process.env.LLM_BASE_URL ?? "https://llm.born2smile.co.kr").trim() || "https://llm.born2smile.co.kr");
const LLM_MODEL = ((process.env.LLM_MODEL ?? "fast").trim() || "fast");
const CLOUDFLARE_ACCESS_CLIENT_ID = process.env.CLOUDFLARE_ACCESS_CLIENT_ID?.trim() ?? "";
const CLOUDFLARE_ACCESS_CLIENT_SECRET = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim() ?? "";
const LLM_UPSTREAM_TIMEOUT_MS = Number(process.env.LLM_UPSTREAM_TIMEOUT_MS ?? "25000");

interface SuggestionFilters {
  status?: AiOpsSuggestionStatus | "all";
  targetType?: AiOpsTargetType | "all";
  limit?: number;
}

interface CreateSuggestionInput {
  targetType: AiOpsTargetType;
  targetId: string;
  suggestionType: AiOpsSuggestionType;
  actorEmail: string;
}

interface ActionInput {
  id: number;
  actorEmail: string;
  note?: string;
}

interface SuggestionRow {
  id: number;
  target_type: AiOpsTargetType;
  target_id: string;
  suggestion_type: AiOpsSuggestionType;
  title: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  reason: string;
  priority_score: number;
  status: AiOpsSuggestionStatus;
  created_at: string;
  created_by: string;
  approved_at: string | null;
  approved_by: string | null;
  applied_at: string | null;
  applied_by: string | null;
}

interface ActionRow {
  id: number;
  suggestion_id: number;
  action: AiOpsActionType;
  actor_email: string;
  note: string | null;
  created_at: string;
}

interface BlogTargetContext {
  targetType: "post";
  targetId: string;
  targetLabel: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  date: string;
  blocks?: unknown[];
  content?: unknown[];
}

interface PageTargetContext {
  targetType: "page";
  targetId: string;
  targetLabel: string;
  title: string;
  subtitle: string;
  description: string;
  faqCount: number;
  pagePath: string;
}

type TargetContext = BlogTargetContext | PageTargetContext;

type GeneratedSuggestion = {
  title: string;
  reason: string;
  beforeJson: Record<string, unknown>;
  afterJson: Record<string, unknown>;
};

interface PageTargetDefinition {
  id: string;
  label: string;
  pagePath: string;
  title: string;
  subtitle: string;
  description: string;
  faqCount: number;
  note: string;
}

const CORE_PAGE_TARGETS: PageTargetDefinition[] = [
  {
    id: "home",
    label: "홈",
    pagePath: "/",
    title: `${CLINIC.name} 홈페이지`,
    subtitle: "꼭 필요한 치료만, 오래오래 편안하게",
    description: "서울대 출신 통합치의학전문의가 자연치아를 지키는 치료 철학, 대표원장 인사말, 진료 약속, 치료 FAQ와 상담 CTA를 한 번에 안내하는 메인 랜딩 페이지입니다.",
    faqCount: 6,
    note: "메인 랜딩 · 브랜드 메시지",
  },
  {
    id: "about",
    label: "병원 소개",
    pagePath: "/about",
    title: "병원 소개",
    subtitle: "서울대 출신 통합치의학전문의가 정성을 다해 진료합니다",
    description: `${CLINIC.name}의 진료 철학, 대표원장 학력과 임상경험, 치과위생사 팀, 시설과 장비, 진료시간, 오시는 길 정보를 안내하는 소개 페이지입니다.`,
    faqCount: 0,
    note: "브랜드 신뢰 · 의료진 소개",
  },
  {
    id: "contact",
    label: "상담 안내",
    pagePath: "/contact",
    title: "상담 안내",
    subtitle: "전화로 편리하게 상담받으세요",
    description: `${CLINIC.name} 대표전화, 진료시간, 카카오톡 상담 채널, 주소와 지도 정보를 제공해 실제 상담 및 예약 전환을 유도하는 페이지입니다.`,
    faqCount: 0,
    note: "전환 랜딩 · 연락처/지도",
  },
  {
    id: "faq",
    label: "자주 묻는 질문",
    pagePath: "/faq",
    title: "자주 묻는 질문",
    subtitle: "진료 과목별로 궁금한 점을 확인하세요",
    description: `임플란트, 교정, 보철, 소아치료, 보존치료, 스케일링 상담에서 자주 묻는 비용, 통증, 기간, 관리법을 ${CLINIC.name} 기준으로 정리한 FAQ 허브입니다.`,
    faqCount: Object.values(TREATMENT_DETAILS).reduce((sum, detail) => sum + detail.faq.length, 0),
    note: "FAQ 허브 · 질문형 검색 대응",
  },
  {
    id: "treatments-overview",
    label: "진료 안내",
    pagePath: "/treatments",
    title: "진료 안내",
    subtitle: `자연치아를 지키는 치료, ${CLINIC.name}에서 시작하세요.`,
    description: `${CLINIC.name}에서 제공하는 임플란트, 치아교정, 보철, 소아치료, 보존치료, 예방치료를 한눈에 비교하고 상담 방향을 잡도록 돕는 진료 개요 페이지입니다.`,
    faqCount: 0,
    note: "진료 카테고리 허브",
  },
  {
    id: "blog-overview",
    label: "건강칼럼",
    pagePath: "/blog",
    title: "건강칼럼",
    subtitle: "올바른 구강관리법과 치과 상식을 쉽고 정확하게 알려드립니다.",
    description: `${CLINIC.name} 건강칼럼 허브로, 예방관리부터 임플란트·교정 후 관리, 소아 구강관리, 팩트체크 콘텐츠까지 탐색할 수 있는 블로그 랜딩 페이지입니다.`,
    faqCount: 0,
    note: "콘텐츠 허브 · 블로그 진입점",
  },
];

const PAGE_TARGETS: PageTargetDefinition[] = [
  ...CORE_PAGE_TARGETS,
  ...TREATMENTS.map((treatment) => {
    const detail = TREATMENT_DETAILS[treatment.id];
    return {
      id: treatment.id,
      label: `${treatment.name} 페이지`,
      pagePath: treatment.href,
      title: treatment.name,
      subtitle: detail.subtitle,
      description: detail.description,
      faqCount: detail.faq.length,
      note: treatment.shortDesc,
    };
  }),
];

function findPageTarget(targetId: string) {
  return PAGE_TARGETS.find((page) => page.id === targetId);
}

function getLlmHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (CLOUDFLARE_ACCESS_CLIENT_ID && CLOUDFLARE_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = CLOUDFLARE_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = CLOUDFLARE_ACCESS_CLIENT_SECRET;
  }

  return headers;
}

function getLlmTimeoutMs() {
  if (!Number.isFinite(LLM_UPSTREAM_TIMEOUT_MS) || LLM_UPSTREAM_TIMEOUT_MS < 5_000) {
    return 25_000;
  }
  return Math.min(LLM_UPSTREAM_TIMEOUT_MS, 45_000);
}

async function callJsonLlm<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: getLlmHeaders(),
      body: JSON.stringify({
        model: LLM_MODEL,
        stream: false,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(getLlmTimeoutMs()),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map((item) => item.text ?? "").join("")
      : content;

    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.warn("[ai-ops] llm generation failed, using fallback", error);
    return null;
  }
}

function clampScore(score: number) {
  return Math.max(1, Math.min(100, Math.round(score)));
}

function isSupportedApplyType(type: AiOpsSuggestionType) {
  return type === "title" || type === "meta_description" || type === "faq" || type === "body_revision";
}

function formatTargetLabel(targetType: AiOpsTargetType, targetId: string) {
  if (targetType === "page") {
    const page = findPageTarget(targetId);
    return page?.label ?? `${targetId} 페이지`;
  }
  if (targetType === "post") {
    return targetId;
  }
  return "사이트 전체";
}

function toPeriodType(period: AiOpsBriefingPeriod): AiOpsBriefingPeriodType {
  return period === "7d" ? "daily" : "weekly";
}

function normalizeDaysOld(date: string) {
  const today = new Date(getTodayKST());
  const then = new Date(date);
  return Math.max(0, Math.floor((today.getTime() - then.getTime()) / 86_400_000));
}

function buildIssue(code: string, label: string, detail: string): AiOpsCandidateIssue {
  return { code, label, detail };
}

async function buildCandidates(period: AiOpsBriefingPeriod) {
  const analyticsPeriod = period === "7d" ? "7d" : "30d";
  const [posts, analyticsResult, searchResult] = await Promise.all([
    getAllPostMetas().catch(() => []),
    fetchGA4Data(analyticsPeriod).catch(() => null),
    fetchSearchConsoleData(period).catch(() => null),
  ]);

  const blogPageMetrics = new Map((searchResult?.blogPages ?? []).map((row) => [row.page, row]));
  const pageMetrics = new Map((searchResult?.topPages ?? []).map((row) => [row.page, row]));

  const blogCandidates: AiOpsCandidate[] = posts.map((post): AiOpsCandidate => {
    const metrics = blogPageMetrics.get(`/blog/${post.category}/${post.slug}`)
      ?? blogPageMetrics.get(`/blog/${post.slug}`)
      ?? Array.from(blogPageMetrics.values()).find((item) => item.page.endsWith(`/${post.slug}`));

    const issues: AiOpsCandidateIssue[] = [];
    let score = 0;
    if (metrics?.impressions && metrics.impressions >= 60 && metrics.ctr < 2.5) {
      score += 35;
      issues.push(buildIssue("low_ctr", "CTR 낮음", `노출 ${metrics.impressions.toLocaleString("ko-KR")} 대비 CTR ${metrics.ctr.toFixed(1)}%`));
    }
    if (metrics?.position && metrics.position > 8) {
      score += 22;
      issues.push(buildIssue("position", "순위 보강 필요", `평균 검색 순위 ${metrics.position.toFixed(1)}위`));
    }

    const ageDays = normalizeDaysOld(post.dateModified ?? post.date);
    if (ageDays >= 120) {
      score += 16;
      issues.push(buildIssue("stale", "업데이트 지연", `최근 수정 후 ${ageDays}일 경과`));
    }
    if (post.excerpt.length < 90) {
      score += 10;
      issues.push(buildIssue("thin_excerpt", "메타 설명 약함", "검색 스니펫으로 쓰일 요약문이 짧습니다."));
    }
    if (!post.published) {
      score += 8;
      issues.push(buildIssue("draft", "초안 상태", "발행 전 품질 점검과 발행 일정 검토가 필요합니다."));
    }

    return {
      id: `post:${post.slug}`,
      targetType: "post",
      targetId: post.slug,
      title: post.title,
      subtitle: post.subtitle,
      suggestionTypes: ["title", "meta_description", "faq", "body_revision"],
      priorityScore: clampScore(score),
      primaryIssue: issues[0]?.label ?? "운영 점검",
      issues: issues.length > 0 ? issues : [buildIssue("monitor", "운영 점검", "최근 지표 기준으로 우선순위는 낮지만 정기 점검 대상입니다.")],
      stats: {
        impressions: metrics?.impressions,
        ctr: metrics?.ctr,
        position: metrics?.position,
        clicks: metrics?.clicks,
        publishedDate: post.date,
      },
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  const pageCandidates: AiOpsCandidate[] = PAGE_TARGETS.map((page): AiOpsCandidate => {
    const metrics = pageMetrics.get(page.pagePath);
    const issues: AiOpsCandidateIssue[] = [];
    let score = page.pagePath === "/contact" ? 10 : 5;

    if (metrics?.impressions && metrics.impressions >= 80 && metrics.ctr < 2.8) {
      score += 32;
      issues.push(buildIssue("low_ctr", "CTR 낮음", `노출 ${metrics.impressions.toLocaleString("ko-KR")} 대비 CTR ${metrics.ctr.toFixed(1)}%`));
    }
    if (metrics?.position && metrics.position > 6) {
      score += 24;
      issues.push(buildIssue("position", "순위 보강 필요", `평균 검색 순위 ${metrics.position.toFixed(1)}위`));
    }
    if (page.faqCount > 0 && page.faqCount < 6) {
      score += 8;
      issues.push(buildIssue("faq", "FAQ 보강 여지", "질문형 검색 의도 대응을 위해 FAQ 확장이 유효할 수 있습니다."));
    }
    if (page.description.length < 260) {
      score += 10;
      issues.push(buildIssue("copy", "본문 보강 여지", "설명 길이가 짧아 검색/설명 문구 보강 여지가 있습니다."));
    }
    if (page.pagePath === "/contact" && (!metrics?.ctr || metrics.ctr < 4)) {
      score += 12;
      issues.push(buildIssue("conversion", "전환 문구 점검", "상담 전환 페이지는 클릭 이후 전화/예약 의도 전달을 더 분명하게 다듬을 수 있습니다."));
    }

    return {
      id: `page:${page.id}`,
      targetType: "page",
      targetId: page.id,
      title: page.label,
      subtitle: page.subtitle,
      suggestionTypes: ["title", "meta_description", "faq", "body_revision"],
      priorityScore: clampScore(score),
      primaryIssue: issues[0]?.label ?? "정기 점검",
      issues: issues.length > 0 ? issues : [buildIssue("monitor", "정기 점검", "핵심 랜딩 페이지 상태를 정기적으로 검토하세요.")],
      stats: {
        impressions: metrics?.impressions,
        ctr: metrics?.ctr,
        position: metrics?.position,
        clicks: metrics?.clicks,
      },
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    analyticsResult,
    searchResult,
    blogCandidates,
    pageCandidates,
  };
}

async function persistBriefing(briefing: AiOpsBriefing) {
  if (!isSupabaseAdminConfigured) return;
  try {
    await getSupabaseAdmin().from(BRIEFINGS_TABLE).insert({
      period_type: briefing.periodType,
      headline: briefing.headline,
      summary: briefing.summary,
      metrics_json: briefing.metrics,
      recommended_actions_json: briefing.recommendedActions,
    });
  } catch (error) {
    console.warn("[ai-ops] failed to persist briefing", error);
  }
}

export async function getAiOpsBriefing(period: AiOpsBriefingPeriod): Promise<AiOpsBriefing> {
  const { analyticsResult, searchResult, blogCandidates, pageCandidates } = await buildCandidates(period);
  const topCandidates = [...blogCandidates.slice(0, 4), ...pageCandidates.slice(0, 3)]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);

  const recommendedActions: AiOpsRecommendedAction[] = topCandidates.slice(0, 4).map((candidate) => ({
    id: `${candidate.id}:${candidate.suggestionTypes[0]}`,
    title: candidate.targetType === "post"
      ? `${candidate.title} 개선안 생성`
      : `${candidate.title} 진단안 생성`,
    description: candidate.issues[0]?.detail ?? candidate.primaryIssue,
    targetType: candidate.targetType,
    targetId: candidate.targetId,
    suggestionType: candidate.suggestionTypes[0],
    priorityScore: candidate.priorityScore,
  }));

  const metrics = {
    sessions: analyticsResult?.summary.sessions.value ?? null,
    sessionsChange: analyticsResult?.summary.sessions.change ?? null,
    clicks: searchResult?.summary.clicks.value ?? null,
    clicksChange: searchResult?.summary.clicks.change ?? null,
    impressions: searchResult?.summary.impressions.value ?? null,
    impressionsChange: searchResult?.summary.impressions.change ?? null,
    postsNeedingAttention: blogCandidates.filter((item) => item.priorityScore >= 25).length,
    pagesNeedingAttention: pageCandidates.filter((item) => item.priorityScore >= 25).length,
  };

  const headline = metrics.postsNeedingAttention + metrics.pagesNeedingAttention > 0
    ? `지금 점검할 AI 운영 후보 ${metrics.postsNeedingAttention + metrics.pagesNeedingAttention}건`
    : "지금 당장 급한 운영 위험은 크지 않습니다";
  const summary = [
    metrics.clicks !== null ? `검색 클릭 ${metrics.clicks.toLocaleString("ko-KR")}회` : "검색 클릭 데이터 없음",
    metrics.impressions !== null ? `노출 ${metrics.impressions.toLocaleString("ko-KR")}회` : "노출 데이터 없음",
    `블로그 후보 ${metrics.postsNeedingAttention}건`,
    `핵심 페이지 후보 ${metrics.pagesNeedingAttention}건`,
  ].join(" · ");

  const briefing: AiOpsBriefing = {
    period,
    periodType: toPeriodType(period),
    generatedAt: new Date().toISOString(),
    headline,
    summary,
    metrics,
    recommendedActions,
    topCandidates,
  };

  void persistBriefing(briefing);
  return briefing;
}

export async function getAiOpsTargets(): Promise<AiOpsTargetOption[]> {
  const posts = await getAllPostMetas().catch(() => []);
  return [
    ...posts.slice(0, 50).map((post) => ({
      id: post.slug,
      label: post.title,
      targetType: "post" as const,
      note: `${post.category} · ${post.published ? "발행" : "초안"}`,
    })),
    ...PAGE_TARGETS.map((page) => ({
      id: page.id,
      label: page.label,
      targetType: "page" as const,
      note: page.note,
    })),
  ];
}

async function resolveTargetContext(targetType: AiOpsTargetType, targetId: string): Promise<TargetContext> {
  if (targetType === "post") {
    const post = await getPostBySlug(targetId);
    if (!post) {
      throw new Error(`포스트를 찾을 수 없습니다: ${targetId}`);
    }

    return {
      targetType: "post",
      targetId,
      targetLabel: post.title,
      title: post.title,
      subtitle: post.subtitle,
      excerpt: post.excerpt,
      category: post.category,
      date: post.date,
      blocks: post.blocks,
      content: post.content,
    };
  }

  if (targetType === "page") {
    const page = findPageTarget(targetId);
    if (!page) {
      throw new Error(`페이지를 찾을 수 없습니다: ${targetId}`);
    }

    return {
      targetType: "page",
      targetId,
      targetLabel: page.label,
      title: page.title,
      subtitle: page.subtitle,
      description: page.description,
      faqCount: page.faqCount,
      pagePath: page.pagePath,
    };
  }

  throw new Error(`지원하지 않는 대상 유형입니다: ${targetType}`);
}

function buildFallbackSuggestion(context: TargetContext, suggestionType: AiOpsSuggestionType): GeneratedSuggestion {
  if (context.targetType === "post") {
    switch (suggestionType) {
      case "title":
        return {
          title: `${context.title} 개선안`,
          reason: "현재 제목의 검색 의도를 더 선명하게 드러내도록 질문형 표현을 보강했습니다.",
          beforeJson: { title: context.title },
          afterJson: { title: `${context.title.replace(/\s*\|.*$/, "")} 전 꼭 확인할 점` },
        };
      case "meta_description":
        return {
          title: `${context.title} 요약문 개선안`,
          reason: "검색 결과 스니펫으로 쓰일 수 있도록 핵심 증상·행동 가이드를 짧게 재정리했습니다.",
          beforeJson: { excerpt: context.excerpt },
          afterJson: { excerpt: `${context.title}를 찾는 분이 먼저 확인해야 할 증상 기준, 집에서의 관리 포인트, 내원 시점을 짧게 정리했어요.` },
        };
      case "faq":
        return {
          title: `${context.title} FAQ 추가안`,
          reason: "환자 질문형 검색 의도를 보강하기 위해 FAQ를 추가합니다.",
          beforeJson: { faqCount: Array.isArray(context.blocks) ? context.blocks.filter((block) => (block as { type?: string }).type === "faq").length : 0 },
          afterJson: {
            faq: {
              question: `${context.title} 후 언제 다시 치과에 가야 하나요?`,
              answer: "증상이 하루이틀 사이에 빠르게 심해지거나 통증·붓기가 지속되면 미루지 말고 검진을 받는 것이 좋아요. 일상 관리로 괜찮아지는 경우도 있지만, 통증이 반복되면 원인을 정확히 확인해야 합니다.",
            },
          },
        };
      case "body_revision":
        return {
          title: `${context.title} 도입부 보강안`,
          reason: "도입부에서 환자 상황과 글의 가치를 더 빨리 전달하도록 리드 문장을 다듬습니다.",
          beforeJson: { subtitle: context.subtitle, excerpt: context.excerpt },
          afterJson: {
            subtitle: `${context.subtitle} 먼저 확인해야 할 기준을 정리했어요.`,
            excerpt: `${context.title} 때문에 검색하셨다면 지금 단계에서 무엇을 확인해야 하는지, 집에서 어떻게 관리하면 되는지, 언제 검진이 필요한지 순서대로 안내해 드릴게요.`,
          },
        };
      case "internal_links":
      default:
        return {
          title: `${context.title} 내부링크 제안`,
          reason: "연관 진료/블로그로 이어지는 내부 링크를 보강해 탐색 흐름을 강화합니다.",
          beforeJson: { relatedLinks: [] },
          afterJson: {
            relatedLinks: [
              {
                title: "진료 안내 바로가기",
                href: "/treatments",
                description: "관련 진료 페이지로 이어지는 내부 링크 제안입니다.",
              },
            ],
          },
        };
    }
  }

  switch (suggestionType) {
    case "title":
      return {
        title: `${context.title} 메타 타이틀 개선안`,
        reason: "지역 키워드와 진료 의도를 더 분명하게 드러내도록 제안합니다.",
        beforeJson: { title: context.title },
        afterJson: { proposedTitle: `김포 ${context.title} | ${context.subtitle}` },
      };
    case "meta_description":
      return {
        title: `${context.title} 메타 설명 개선안`,
        reason: "검색 결과에서 환자 관점 질문과 답을 더 분명하게 보여주도록 정리합니다.",
        beforeJson: { description: context.description },
        afterJson: { proposedDescription: `${context.title}가 필요할 때 먼저 확인할 기준, 치료 과정, 내원 전후 체크포인트를 한눈에 이해하기 쉽게 정리한 메타 설명 제안입니다.` },
      };
    case "faq":
      return {
        title: `${context.title} FAQ 보강안`,
        reason: "질문형 검색 대응을 위해 핵심 질문을 한 개 추가합니다.",
        beforeJson: { faqCount: context.faqCount },
        afterJson: {
          faq: {
            question: `${context.title}를 선택할 때 무엇을 먼저 확인해야 하나요?`,
            answer: "진료 전 검사 범위, 치료 과정 설명, 통증 관리 계획, 치료 후 재내원 기준을 함께 확인하면 선택에 도움이 됩니다.",
          },
        },
      };
    case "body_revision":
      return {
        title: `${context.title} 본문 보강안`,
        reason: "첫 문단에서 환자 고민과 치료 가치가 더 빨리 드러나도록 제안합니다.",
        beforeJson: { description: context.description },
        afterJson: { proposedDescription: `${context.description} 특히 내원 전 궁금해하시는 치료 기간, 통증 관리, 회복 흐름까지 자연스럽게 이해할 수 있도록 설명을 보강합니다.` },
      };
    case "internal_links":
    default:
      return {
        title: `${context.title} 내부링크 보강안`,
        reason: "연관 블로그/진료 페이지 링크 후보를 제안합니다.",
        beforeJson: { pagePath: context.pagePath },
        afterJson: {
          relatedLinks: [
            { title: "블로그 허브", href: "/blog", description: "관련 증상/치료 가이드를 연결합니다." },
          ],
        },
      };
  }
}

function buildLlmPrompt(context: TargetContext, suggestionType: AiOpsSuggestionType) {
  const systemPrompt = `당신은 서울본치과 웹사이트 운영을 돕는 AI 에디터입니다.
과장 표현, 공포 마케팅, 확정적 치료 보장은 금지합니다.
친절하고 명확한 한국어로 작성하고 JSON만 출력하세요.`;

  const schemaByType: Record<AiOpsSuggestionType, string> = {
    title: '{"title":"...","reason":"..."}',
    meta_description: context.targetType === "post"
      ? '{"excerpt":"...","reason":"..."}'
      : '{"proposedDescription":"...","reason":"..."}',
    faq: '{"faq":{"question":"...","answer":"..."},"reason":"..."}',
    internal_links: '{"relatedLinks":[{"title":"...","href":"...","description":"..."}],"reason":"..."}',
    body_revision: context.targetType === "post"
      ? '{"subtitle":"...","excerpt":"...","reason":"..."}'
      : '{"proposedDescription":"...","reason":"..."}',
  };

  const userPrompt = [
    `대상 유형: ${context.targetType}`,
    `제안 유형: ${suggestionType}`,
    `출력 스키마: ${schemaByType[suggestionType]}`,
    `현재 정보: ${JSON.stringify(context, null, 2)}`,
    "반드시 JSON만 출력하세요.",
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}

async function generateSuggestion(context: TargetContext, suggestionType: AiOpsSuggestionType): Promise<GeneratedSuggestion> {
  const fallback = buildFallbackSuggestion(context, suggestionType);
  const { systemPrompt, userPrompt } = buildLlmPrompt(context, suggestionType);
  const llm = await callJsonLlm<Record<string, unknown>>(systemPrompt, userPrompt);
  if (!llm || typeof llm !== "object") {
    return fallback;
  }

  const reason = typeof llm.reason === "string" && llm.reason.trim().length > 0
    ? llm.reason.trim()
    : fallback.reason;

  if (suggestionType === "title" && typeof llm.title === "string") {
    return {
      title: fallback.title,
      reason,
      beforeJson: fallback.beforeJson,
      afterJson: { title: llm.title.trim() },
    };
  }

  if (suggestionType === "meta_description") {
    if (context.targetType === "post" && typeof llm.excerpt === "string") {
      return { title: fallback.title, reason, beforeJson: fallback.beforeJson, afterJson: { excerpt: llm.excerpt.trim() } };
    }
    if (typeof llm.proposedDescription === "string") {
      return { title: fallback.title, reason, beforeJson: fallback.beforeJson, afterJson: { proposedDescription: llm.proposedDescription.trim() } };
    }
  }

  if (suggestionType === "faq") {
    const faq = llm.faq as { question?: string; answer?: string } | undefined;
    if (faq?.question && faq?.answer) {
      return {
        title: fallback.title,
        reason,
        beforeJson: fallback.beforeJson,
        afterJson: { faq: { question: faq.question.trim(), answer: faq.answer.trim() } },
      };
    }
  }

  if (suggestionType === "body_revision") {
    if (context.targetType === "post") {
      const excerpt = typeof llm.excerpt === "string" ? llm.excerpt.trim() : undefined;
      const subtitle = typeof llm.subtitle === "string" ? llm.subtitle.trim() : undefined;
      if (excerpt || subtitle) {
        return {
          title: fallback.title,
          reason,
          beforeJson: fallback.beforeJson,
          afterJson: {
            ...(subtitle ? { subtitle } : {}),
            ...(excerpt ? { excerpt } : {}),
          },
        };
      }
    }
    if (typeof llm.proposedDescription === "string") {
      return {
        title: fallback.title,
        reason,
        beforeJson: fallback.beforeJson,
        afterJson: { proposedDescription: llm.proposedDescription.trim() },
      };
    }
  }

  if (suggestionType === "internal_links" && Array.isArray(llm.relatedLinks)) {
    const links = llm.relatedLinks.filter((link): link is { title: string; href: string; description?: string } => (
      Boolean(link)
      && typeof link === "object"
      && typeof (link as { title?: unknown }).title === "string"
      && typeof (link as { href?: unknown }).href === "string"
    ));
    if (links.length > 0) {
      return {
        title: fallback.title,
        reason,
        beforeJson: fallback.beforeJson,
        afterJson: { relatedLinks: links.slice(0, 4) },
      };
    }
  }

  return fallback;
}

async function insertAction(suggestionId: number, action: AiOpsActionType, actorEmail: string, note?: string) {
  if (!isSupabaseAdminConfigured) return;
  await getSupabaseAdmin().from(ACTIONS_TABLE).insert({
    suggestion_id: suggestionId,
    action,
    actor_email: actorEmail,
    note: note?.trim() ? note.trim() : null,
  });
}

function mapSuggestionRow(row: SuggestionRow): AiOpsSuggestionListItem {
  const targetLabel = formatTargetLabel(row.target_type, row.target_id);
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    suggestionType: row.suggestion_type,
    title: row.title,
    beforeJson: row.before_json ?? {},
    afterJson: row.after_json ?? {},
    reason: row.reason,
    priorityScore: row.priority_score,
    status: row.status,
    createdAt: row.created_at,
    createdBy: row.created_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    appliedAt: row.applied_at,
    appliedBy: row.applied_by,
    targetLabel,
    canApply: row.target_type === "post" && isSupportedApplyType(row.suggestion_type) && row.status === "approved",
  };
}

async function getSuggestionById(id: number) {
  if (!isSupabaseAdminConfigured) {
    throw new Error("Supabase admin이 설정되지 않았습니다");
  }
  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as SuggestionRow;
}

export async function listAiSuggestions(filters: SuggestionFilters = {}): Promise<AiOpsSuggestionListItem[]> {
  if (!isSupabaseAdminConfigured) return [];

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  let query = getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.targetType && filters.targetType !== "all") {
    query = query.eq("target_type", filters.targetType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as SuggestionRow[]).map(mapSuggestionRow);
}

export async function createAiSuggestion(input: CreateSuggestionInput): Promise<AiOpsSuggestionListItem> {
  const context = await resolveTargetContext(input.targetType, input.targetId);
  const generated = await generateSuggestion(context, input.suggestionType);
  const { blogCandidates, pageCandidates } = await buildCandidates("28d");
  const candidate = [...blogCandidates, ...pageCandidates].find((item) => item.targetType === input.targetType && item.targetId === input.targetId);
  const priorityScore = candidate?.priorityScore ?? 20;

  if (!isSupabaseAdminConfigured) {
    return {
      id: Date.now(),
      targetType: input.targetType,
      targetId: input.targetId,
      suggestionType: input.suggestionType,
      title: generated.title,
      beforeJson: generated.beforeJson,
      afterJson: generated.afterJson,
      reason: generated.reason,
      priorityScore,
      status: "draft",
      createdAt: new Date().toISOString(),
      createdBy: input.actorEmail,
      approvedAt: null,
      approvedBy: null,
      appliedAt: null,
      appliedBy: null,
      targetLabel: context.targetLabel,
      canApply: input.targetType === "post" && isSupportedApplyType(input.suggestionType),
    };
  }

  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .insert({
      target_type: input.targetType,
      target_id: input.targetId,
      suggestion_type: input.suggestionType,
      title: generated.title,
      before_json: generated.beforeJson,
      after_json: generated.afterJson,
      reason: generated.reason,
      priority_score: priorityScore,
      status: "draft",
      created_by: input.actorEmail,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapSuggestionRow(data as SuggestionRow);
}

export async function approveAiSuggestion({ id, actorEmail, note }: ActionInput): Promise<AiOpsSuggestionListItem> {
  if (!isSupabaseAdminConfigured) throw new Error("Supabase admin이 설정되지 않았습니다");
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .update({ status: "approved", approved_at: now, approved_by: actorEmail })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await insertAction(id, "approve", actorEmail, note);
  return mapSuggestionRow(data as SuggestionRow);
}

export async function rejectAiSuggestion({ id, actorEmail, note }: ActionInput): Promise<AiOpsSuggestionListItem> {
  if (!isSupabaseAdminConfigured) throw new Error("Supabase admin이 설정되지 않았습니다");
  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .update({ status: "rejected" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await insertAction(id, "reject", actorEmail, note);
  return mapSuggestionRow(data as SuggestionRow);
}

function appendFaqPatch(existing: BlogTargetContext, faq: { question: string; answer: string }): UpdateBlogPostData {
  if (Array.isArray(existing.blocks) && existing.blocks.length > 0) {
    return {
      blocks: [
        ...existing.blocks,
        {
          type: "faq",
          question: faq.question,
          answer: faq.answer,
        },
      ] as NonNullable<UpdateBlogPostData["blocks"]>,
    };
  }

  return {
    content: [
      ...((existing.content ?? []) as NonNullable<UpdateBlogPostData["content"]>),
      {
        heading: faq.question,
        content: faq.answer,
      },
    ],
  };
}

export async function applyAiSuggestion({ id, actorEmail, note }: ActionInput): Promise<AiOpsSuggestionListItem> {
  const suggestion = await getSuggestionById(id);
  if (suggestion.target_type !== "post") {
    throw new Error("블로그 제안만 자동 반영할 수 있습니다");
  }
  if (suggestion.status !== "approved") {
    throw new Error("승인된 제안만 반영할 수 있습니다");
  }

  const context = await resolveTargetContext("post", suggestion.target_id) as BlogTargetContext;
  const patch: UpdateBlogPostData = {};
  const after = suggestion.after_json ?? {};

  switch (suggestion.suggestion_type) {
    case "title":
      if (typeof after.title !== "string" || after.title.trim().length === 0) {
        throw new Error("제안된 제목이 올바르지 않습니다");
      }
      patch.title = after.title.trim();
      break;
    case "meta_description":
      if (typeof after.excerpt !== "string" || after.excerpt.trim().length === 0) {
        throw new Error("제안된 요약문이 올바르지 않습니다");
      }
      patch.excerpt = after.excerpt.trim();
      break;
    case "body_revision":
      if (typeof after.subtitle === "string" && after.subtitle.trim()) {
        patch.subtitle = after.subtitle.trim();
      }
      if (typeof after.excerpt === "string" && after.excerpt.trim()) {
        patch.excerpt = after.excerpt.trim();
      }
      if (Object.keys(patch).length === 0) {
        throw new Error("반영할 본문 보강 필드가 없습니다");
      }
      break;
    case "faq": {
      const faq = after.faq as { question?: string; answer?: string } | undefined;
      if (!faq?.question || !faq.answer) {
        throw new Error("FAQ 제안 형식이 올바르지 않습니다");
      }
      Object.assign(patch, appendFaqPatch(context, {
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }));
      break;
    }
    default:
      throw new Error("이 제안 유형은 자동 반영을 지원하지 않습니다");
  }

  patch.dateModified = getTodayKST();
  await updateBlogPost(suggestion.target_id, patch, actorEmail);

  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .update({ status: "applied", applied_at: now, applied_by: actorEmail })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await insertAction(id, "apply", actorEmail, note);
  return mapSuggestionRow(data as SuggestionRow);
}

export async function listAiActivity(limit = 30): Promise<AiOpsActivityItem[]> {
  if (!isSupabaseAdminConfigured) return [];
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const [actionsRes, suggestionsRes] = await Promise.all([
    getSupabaseAdmin().from(ACTIONS_TABLE).select("*").order("created_at", { ascending: false }).limit(safeLimit),
    getSupabaseAdmin().from(SUGGESTIONS_TABLE).select("id, title, suggestion_type, target_type, target_id"),
  ]);

  if (actionsRes.error) throw actionsRes.error;
  if (suggestionsRes.error) throw suggestionsRes.error;

  const suggestions = new Map((suggestionsRes.data as Array<{
    id: number;
    title: string;
    suggestion_type: AiOpsSuggestionType;
    target_type: AiOpsTargetType;
    target_id: string;
  }>).map((item) => [item.id, item]));

  return (actionsRes.data as ActionRow[]).flatMap((action) => {
    const suggestion = suggestions.get(action.suggestion_id);
    if (!suggestion) return [];
    return [{
      id: action.id,
      suggestionId: action.suggestion_id,
      action: action.action,
      actorEmail: action.actor_email,
      note: action.note,
      createdAt: action.created_at,
      suggestionTitle: suggestion.title,
      suggestionType: suggestion.suggestion_type,
      targetType: suggestion.target_type,
      targetId: suggestion.target_id,
      targetLabel: formatTargetLabel(suggestion.target_type, suggestion.target_id),
    }];
  });
}
