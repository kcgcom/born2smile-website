import { getTodayKST } from "./date";
import { getAllPostMetasFresh, getPostBySlugFresh, updateBlogPost, type UpdateBlogPostData } from "./blog-supabase";
import { fetchGA4Data } from "./admin-analytics";
import { fetchSearchConsoleData } from "./admin-search-console";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "./supabase-admin";
import { CLINIC, TREATMENTS } from "./constants";
import { TREATMENT_DETAILS } from "./treatments";
import type { BlogRelatedLinkItem } from "./blog/types";
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

function readOptionalEnv(key: string) {
  const raw = process.env[key]?.trim();
  if (!raw) return "";
  if (raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") {
    return "";
  }
  return raw;
}

const LLM_BASE_URL = readOptionalEnv("LLM_BASE_URL") || "https://llm.born2smile.co.kr";
const LLM_MODEL = readOptionalEnv("LLM_MODEL") || "fast";
const CLOUDFLARE_ACCESS_CLIENT_ID = readOptionalEnv("CLOUDFLARE_ACCESS_CLIENT_ID");
const CLOUDFLARE_ACCESS_CLIENT_SECRET = readOptionalEnv("CLOUDFLARE_ACCESS_CLIENT_SECRET");
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
  context?: string;
}

interface CreateSuggestionOptions {
  onProgress?: (input: {
    stage: "context" | "generation" | "persisting";
    message: string;
    metadata?: Record<string, unknown>;
  }) => void | Promise<void>;
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
  blocks: unknown[];
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

type SuggestionBase = Pick<GeneratedSuggestion, "title" | "beforeJson">;

interface SuggestionPromptContext {
  operatorContext?: string;
  priorityScore?: number;
  primaryIssue?: string;
  issues?: AiOpsCandidateIssue[];
  representativeQueries?: string[];
  recentSuggestions?: Array<{
    suggestionType: AiOpsSuggestionType;
    title: string;
    status: AiOpsSuggestionStatus;
    createdAt: string;
    reason: string;
  }>;
  internalLinkCandidates?: BlogRelatedLinkItem[];
}

interface RelatedLinksBlock {
  type: "relatedLinks";
  items: BlogRelatedLinkItem[];
}

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

function isTimeoutError(error: unknown) {
  return error instanceof Error
    && (error.name === "TimeoutError" || /aborted due to timeout/i.test(error.message));
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const normalized = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    : trimmed;

  return JSON.parse(normalized) as T;
}

function getRequiredString(
  value: unknown,
  fieldName: string,
  suggestionType: AiOpsSuggestionType,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`AI가 ${suggestionType} 제안의 ${fieldName} 필드를 올바르게 반환하지 않았습니다`);
  }

  return value.trim();
}

async function callJsonLlm<T>(systemPrompt: string, userPrompt: string): Promise<T> {
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
      throw new Error(`AI 제안 생성 요청이 실패했습니다 (${response.status})`);
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map((item) => item.text ?? "").join("")
      : content;

    if (!text) {
      throw new Error("AI 제안 생성 응답이 비어 있습니다");
    }

    return parseJsonResponse<T>(text);
  } catch (error) {
    console.warn("[ai-ops] llm generation failed", error);
    if (isTimeoutError(error)) {
      throw new Error("AI 제안 생성 시간이 예상보다 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요");
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("AI 제안 생성 중 알 수 없는 오류가 발생했습니다");
  }
}

function clampScore(score: number) {
  return Math.max(1, Math.min(100, Math.round(score)));
}

function isSupportedApplyType(type: AiOpsSuggestionType) {
  return type === "title" || type === "meta_description" || type === "faq" || type === "body_revision" || type === "internal_links";
}

function canAutoApplySuggestion(row: Pick<SuggestionRow, "target_type" | "status" | "suggestion_type" | "before_json">) {
  return row.target_type === "post" && row.status === "approved" && isSupportedApplyType(row.suggestion_type);
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

function isRelatedLinksBlock(value: unknown): value is RelatedLinksBlock {
  return Boolean(value)
    && typeof value === "object"
    && (value as { type?: unknown }).type === "relatedLinks"
    && Array.isArray((value as { items?: unknown }).items);
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

async function buildCandidates(period: AiOpsBriefingPeriod) {
  const analyticsPeriod = period === "7d" ? "7d" : "30d";
  const [posts, analyticsResult, searchResult] = await Promise.all([
    getAllPostMetasFresh().catch(() => []),
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
      suggestionTypes: ["title", "meta_description", "internal_links", "faq", "body_revision"],
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
      suggestionTypes: ["title", "meta_description", "internal_links", "faq", "body_revision"],
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
  const posts = await getAllPostMetasFresh().catch(() => []);
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
    const post = await getPostBySlugFresh(targetId);
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

function buildSuggestionBase(context: TargetContext, suggestionType: AiOpsSuggestionType): SuggestionBase {
  if (context.targetType === "post") {
    switch (suggestionType) {
      case "title":
        return {
          title: `${context.title} 개선안`,
          beforeJson: { title: context.title },
        };
      case "meta_description":
        return {
          title: `${context.title} 요약문 개선안`,
          beforeJson: { excerpt: context.excerpt },
        };
      case "faq":
        return {
          title: `${context.title} FAQ 추가안`,
          beforeJson: {
            faqCount: Array.isArray(context.blocks) ? context.blocks.filter((block) => (block as { type?: string }).type === "faq").length : 0,
          },
        };
      case "body_revision":
        return {
          title: `${context.title} 도입부 보강안`,
          beforeJson: { subtitle: context.subtitle, excerpt: context.excerpt },
        };
      case "internal_links": {
        const existingRelatedLinks = Array.isArray(context.blocks)
          ? context.blocks
            .filter(isRelatedLinksBlock)
            .flatMap((block) => block.items)
          : [];
        return {
          title: `${context.title} 내부링크 제안`,
          beforeJson: {
            existingRelatedLinks,
            relatedLinksCount: existingRelatedLinks.length,
          },
        };
      }
      default:
        return {
          title: `${context.title} 내부링크 제안`,
          beforeJson: {},
        };
    }
  }

  switch (suggestionType) {
    case "title":
      return {
        title: `${context.title} 메타 타이틀 개선안`,
        beforeJson: { title: context.title },
      };
    case "meta_description":
      return {
        title: `${context.title} 메타 설명 개선안`,
        beforeJson: { description: context.description },
      };
    case "faq":
      return {
        title: `${context.title} FAQ 보강안`,
        beforeJson: { faqCount: context.faqCount },
      };
    case "body_revision":
      return {
        title: `${context.title} 본문 보강안`,
        beforeJson: { description: context.description },
      };
    case "internal_links":
    default:
      return {
        title: `${context.title} 내부링크 보강안`,
        beforeJson: { pagePath: context.pagePath },
      };
  }
}

function buildLlmPrompt(
  context: TargetContext,
  suggestionType: AiOpsSuggestionType,
  promptContext: SuggestionPromptContext,
) {
  const systemPrompt = `당신은 서울본치과 웹사이트 운영을 돕는 AI 에디터입니다.
과장 표현, 공포 마케팅, 확정적 치료 보장은 금지합니다.
친절하고 명확한 한국어로 작성하고 JSON만 출력하세요.
특히 내부링크 제안은 제공된 후보 링크만 사용하고 존재하지 않는 URL을 만들지 마세요.`;

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
    `운영 컨텍스트: ${JSON.stringify(promptContext, null, 2)}`,
    "반드시 JSON만 출력하세요.",
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}

async function generateSuggestion(
  context: TargetContext,
  suggestionType: AiOpsSuggestionType,
  promptContext: SuggestionPromptContext,
): Promise<GeneratedSuggestion> {
  if (suggestionType === "internal_links" && (!promptContext.internalLinkCandidates || promptContext.internalLinkCandidates.length === 0)) {
    throw new Error("추천할 내부 링크 후보가 충분하지 않습니다");
  }

  const base = buildSuggestionBase(context, suggestionType);
  const { systemPrompt, userPrompt } = buildLlmPrompt(context, suggestionType, promptContext);
  const llm = await callJsonLlm<Record<string, unknown>>(systemPrompt, userPrompt);
  const reason = getRequiredString(llm.reason, "reason", suggestionType);

  if (suggestionType === "title" && typeof llm.title === "string") {
    return {
      title: base.title,
      reason,
      beforeJson: base.beforeJson,
      afterJson: { title: getRequiredString(llm.title, "title", suggestionType) },
    };
  }

  if (suggestionType === "meta_description") {
    if (context.targetType === "post" && typeof llm.excerpt === "string") {
      return { title: base.title, reason, beforeJson: base.beforeJson, afterJson: { excerpt: getRequiredString(llm.excerpt, "excerpt", suggestionType) } };
    }
    if (typeof llm.proposedDescription === "string") {
      return { title: base.title, reason, beforeJson: base.beforeJson, afterJson: { proposedDescription: getRequiredString(llm.proposedDescription, "proposedDescription", suggestionType) } };
    }
    throw new Error("AI가 meta_description 제안 결과를 올바르게 반환하지 않았습니다");
  }

  if (suggestionType === "faq") {
    const faq = llm.faq as { question?: string; answer?: string } | undefined;
    return {
      title: base.title,
      reason,
      beforeJson: base.beforeJson,
      afterJson: {
        faq: {
          question: getRequiredString(faq?.question, "faq.question", suggestionType),
          answer: getRequiredString(faq?.answer, "faq.answer", suggestionType),
        },
      },
    };
  }

  if (suggestionType === "body_revision") {
    if (context.targetType === "post") {
      const excerpt = typeof llm.excerpt === "string" ? llm.excerpt.trim() : undefined;
      const subtitle = typeof llm.subtitle === "string" ? llm.subtitle.trim() : undefined;
      if (excerpt || subtitle) {
        return {
          title: base.title,
          reason,
          beforeJson: base.beforeJson,
          afterJson: {
            ...(subtitle ? { subtitle } : {}),
            ...(excerpt ? { excerpt } : {}),
          },
        };
      }
      throw new Error("AI가 body_revision 제안의 subtitle/excerpt 필드를 반환하지 않았습니다");
    }
    if (typeof llm.proposedDescription === "string") {
      return {
        title: base.title,
        reason,
        beforeJson: base.beforeJson,
        afterJson: { proposedDescription: getRequiredString(llm.proposedDescription, "proposedDescription", suggestionType) },
      };
    }
    throw new Error("AI가 body_revision 제안의 proposedDescription 필드를 반환하지 않았습니다");
  }

  if (suggestionType === "internal_links" && Array.isArray(llm.relatedLinks)) {
    const allowedLinks = new Map((promptContext.internalLinkCandidates ?? []).map((link) => [link.href, link]));
    const links = llm.relatedLinks
      .filter((link): link is { title: string; href: string; description?: string } => (
        Boolean(link)
        && typeof link === "object"
        && typeof (link as { title?: unknown }).title === "string"
        && typeof (link as { href?: unknown }).href === "string"
      ))
      .map((link) => {
        const href = link.href.trim();
        const matched = allowedLinks.get(href);
        if (!matched) return null;
        const description = typeof link.description === "string" && link.description.trim().length > 0
          ? link.description.trim()
          : matched.description;
        return {
          title: matched.title,
          href: matched.href,
          ...(description ? { description } : {}),
        } satisfies BlogRelatedLinkItem;
      })
      .filter(isPresent);
    if (links.length > 0) {
      return {
        title: base.title,
        reason,
        beforeJson: base.beforeJson,
        afterJson: { relatedLinks: links.slice(0, 4) },
      };
    }
    throw new Error("AI가 internal_links 제안의 relatedLinks 필드를 올바르게 반환하지 않았습니다");
  }

  throw new Error(`AI가 ${suggestionType} 제안을 올바르게 생성하지 못했습니다`);
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
    canApply: canAutoApplySuggestion(row),
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

async function getRecentSuggestionHistory(targetType: AiOpsTargetType, targetId: string) {
  if (!isSupabaseAdminConfigured) return [];

  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .select("suggestion_type, title, status, created_at, reason")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.warn("[ai-ops] failed to load recent suggestion history", error);
    return [];
  }

  return (data as Array<{
    suggestion_type: AiOpsSuggestionType;
    title: string;
    status: AiOpsSuggestionStatus;
    created_at: string;
    reason: string;
  }>).map((item) => ({
    suggestionType: item.suggestion_type,
    title: item.title,
    status: item.status,
    createdAt: item.created_at,
    reason: item.reason,
  }));
}

function toBlogPath(category: string, slug: string) {
  return `/blog/${category}/${slug}`;
}

function dedupeRelatedLinks(links: BlogRelatedLinkItem[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.href}::${link.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildInternalLinkCandidates(
  context: TargetContext,
  posts: Awaited<ReturnType<typeof getAllPostMetasFresh>>,
) {
  if (context.targetType !== "post") return [];

  const currentTags = Array.from(new Set(
    posts.find((post) => post.slug === context.targetId)?.tags ?? [],
  ));
  const scoredMatches = posts
    .filter((post) => post.slug !== context.targetId && post.published)
    .map((post) => {
      let score = 0;
      if (post.category === context.category) score += 3;
      if (post.tags.some((tag) => currentTags.includes(tag))) score += 2;
      if (post.dateModified) score += 1;
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, 6)
    .map(({ post }) => ({
      title: post.title,
      href: toBlogPath(post.category, post.slug),
      description: post.excerpt,
    }));

  return dedupeRelatedLinks(scoredMatches);
}

function getTargetPath(context: TargetContext) {
  if (context.targetType === "post") {
    return toBlogPath(context.category, context.targetId);
  }
  return context.pagePath;
}

async function buildSuggestionPromptContext(
  context: TargetContext,
  input: Pick<CreateSuggestionInput, "targetType" | "targetId" | "context">,
  candidateData: Awaited<ReturnType<typeof buildCandidates>>,
) {
  const candidate = [...candidateData.blogCandidates, ...candidateData.pageCandidates]
    .find((item) => item.targetType === input.targetType && item.targetId === input.targetId);
  const targetPath = getTargetPath(context);
  const representativeQueries = candidateData.searchResult?.pageTopQueries?.[targetPath]
    ?.slice(0, 5)
    .map((item) => item.query) ?? [];

  const [posts, recentSuggestions] = await Promise.all([
    getAllPostMetasFresh().catch(() => []),
    getRecentSuggestionHistory(input.targetType, input.targetId),
  ]);

  return {
    promptContext: {
      operatorContext: input.context?.trim() || undefined,
      priorityScore: candidate?.priorityScore,
      primaryIssue: candidate?.primaryIssue,
      issues: candidate?.issues,
      representativeQueries,
      recentSuggestions,
      internalLinkCandidates: buildInternalLinkCandidates(context, posts),
    } satisfies SuggestionPromptContext,
    priorityScore: candidate?.priorityScore ?? 20,
  };
}

export async function createAiSuggestion(
  input: CreateSuggestionInput,
  options?: CreateSuggestionOptions,
): Promise<AiOpsSuggestionListItem> {
  await options?.onProgress?.({
    stage: "context",
    message: "대상 문맥을 수집하고 있습니다.",
    metadata: { targetType: input.targetType, targetId: input.targetId },
  });
  const context = await resolveTargetContext(input.targetType, input.targetId);
  const candidateData = await buildCandidates("28d");
  const { promptContext, priorityScore } = await buildSuggestionPromptContext(context, input, candidateData);
  await options?.onProgress?.({
    stage: "generation",
    message: "AI가 제안 초안을 생성하고 있습니다.",
    metadata: { suggestionType: input.suggestionType },
  });
  const generated = await generateSuggestion(context, input.suggestionType, promptContext);
  await options?.onProgress?.({
    stage: "persisting",
    message: "생성된 제안을 저장하고 있습니다.",
  });

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
      canApply: canAutoApplySuggestion({
        target_type: input.targetType,
        status: "approved",
        suggestion_type: input.suggestionType,
        before_json: generated.beforeJson,
      }),
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

function appendRelatedLinksPatch(existing: BlogTargetContext, links: BlogRelatedLinkItem[]): UpdateBlogPostData {
  if (!Array.isArray(existing.blocks) || existing.blocks.length === 0) {
    throw new Error("내부링크 자동 반영은 블록형 본문에서만 지원합니다");
  }

  const mergedBlocks = [...existing.blocks];
  const existingIndex = mergedBlocks.findIndex(isRelatedLinksBlock);

  if (existingIndex >= 0) {
    const current = mergedBlocks[existingIndex];
    if (!isRelatedLinksBlock(current)) {
      throw new Error("relatedLinks 블록을 처리할 수 없습니다");
    }

    mergedBlocks[existingIndex] = {
      type: "relatedLinks",
      items: dedupeRelatedLinks([...current.items, ...links]).slice(0, 6),
    };
  } else {
    mergedBlocks.push({
      type: "relatedLinks",
      items: links.slice(0, 6),
    });
  }

  return {
    blocks: mergedBlocks as NonNullable<UpdateBlogPostData["blocks"]>,
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
    case "internal_links": {
      const relatedLinks = Array.isArray(after.relatedLinks)
        ? after.relatedLinks.filter((link): link is BlogRelatedLinkItem => (
          Boolean(link)
          && typeof link === "object"
          && typeof (link as { title?: unknown }).title === "string"
          && typeof (link as { href?: unknown }).href === "string"
        ))
          .map((link) => ({
            title: link.title.trim(),
            href: link.href.trim(),
            description: link.description?.trim() || undefined,
          }))
          .filter((link) => link.title.length > 0 && link.href.length > 0)
        : [];

      if (relatedLinks.length === 0) {
        throw new Error("내부링크 제안 형식이 올바르지 않습니다");
      }

      Object.assign(patch, appendRelatedLinksPatch(context, relatedLinks));
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
