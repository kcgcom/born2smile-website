import { getTodayKST } from "./date";
import { getAllPostMetasFresh, getPostBySlugFresh, updateBlogPost, type UpdateBlogPostData } from "./blog-supabase";
import { fetchGA4Data } from "./admin-analytics";
import { fetchSearchConsoleData } from "./admin-search-console";
import { fetchPostHogConversion } from "./admin-posthog";
import { isSupabaseAdminConfigured, getSupabaseAdmin } from "./supabase-admin";
import { CLINIC, TREATMENTS } from "./constants";
import { TREATMENT_DETAILS } from "./treatments";
import type { BlogRelatedLinkItem } from "./blog/types";
import type {
  AiOpsActionType,
  AiOpsActivityItem,
  AiOpsApplyMode,
  AiOpsBriefing,
  AiOpsBriefingPeriod,
  AiOpsBriefingPeriodType,
  AiOpsCandidate,
  AiOpsCandidateIssue,
  AiOpsDifficulty,
  AiOpsEvidence,
  AiOpsMetricSnapshot,
  AiOpsObservationMetrics,
  AiOpsObservationPlan,
  AiOpsObservationWindow,
  AiOpsOutcomesResponse,
  AiOpsPlaybook,
  AiOpsPlaybookId,
  AiOpsOpportunityListResponse,
  AiOpsRecommendedAction,
  AiOpsScoreFactor,
  AiOpsSignalItem,
  AiOpsSignalState,
  AiOpsSignalVerdict,
  AiOpsSuggestedSignalPending,
  AiOpsSuggestionListItem,
  AiOpsSuggestionStatus,
  AiOpsSuggestionType,
  AiOpsTargetOption,
  AiOpsTargetType,
} from "./admin-ai-ops-types";

const BRIEFINGS_TABLE = "ai_agent_briefings";
const SUGGESTIONS_TABLE = "ai_agent_suggestions";
const ACTIONS_TABLE = "ai_agent_actions";
const OUTCOMES_TABLE = "ai_agent_outcomes";

const OBSERVATION_WINDOWS: AiOpsObservationWindow[] = [14, 30, 60];
const COOLDOWN_DAYS = 21;

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

const LOCAL_KEYWORDS = Array.from(new Set([
  "김포",
  "장기동",
  "한강신도시",
  CLINIC.neighborhood.replace(/\s+/g, " ").trim(),
  ...CLINIC.addressShort.split(/[\s,()]+/).map((token) => token.trim()).filter(Boolean),
])).filter((token) => token.length >= 2);

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
  playbookId?: AiOpsPlaybookId;
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
  playbook_id: AiOpsPlaybookId | null;
  title: string;
  before_json: Record<string, unknown>;
  after_json: Record<string, unknown>;
  reason: string;
  priority_score: number;
  status: AiOpsSuggestionStatus;
  apply_mode?: AiOpsApplyMode | null;
  evidence_json?: AiOpsEvidence | null;
  observation_plan_json?: AiOpsObservationPlan | null;
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
  action: Exclude<AiOpsActionType, "measure">;
  actor_email: string;
  note: string | null;
  created_at: string;
}

interface OutcomeRow {
  id: number;
  suggestion_id: number;
  window_days: AiOpsObservationWindow;
  target_type: AiOpsTargetType;
  target_id: string;
  verdict: AiOpsSignalVerdict;
  summary: string;
  confidence_note: string;
  baseline_json: AiOpsObservationMetrics | null;
  observed_json: AiOpsObservationMetrics;
  delta_json: Partial<Record<keyof AiOpsObservationMetrics, number | null>>;
  measured_at: string;
  created_at: string;
  updated_at: string;
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
  playbook?: AiOpsPlaybook;
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

interface OpportunityDatasets {
  posts: Awaited<ReturnType<typeof getAllPostMetasFresh>>;
  analyticsResult: Awaited<ReturnType<typeof fetchGA4Data>> | null;
  searchResult: Awaited<ReturnType<typeof fetchSearchConsoleData>> | null;
  conversionResult: Awaited<ReturnType<typeof fetchPostHogConversion>> | null;
  suggestionRows: SuggestionRow[];
}

interface TargetPerformanceSnapshot {
  targetLabel: string;
  targetPath: string;
  metrics: AiOpsObservationMetrics;
  topQueries: string[];
}

interface PageMetricsRow {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
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
    subtitle: `${CLINIC.name}에서 제공하는 치료를 한눈에 확인하세요`,
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
    } satisfies PageTargetDefinition;
  }),
];

export const AI_OPS_PLAYBOOKS: AiOpsPlaybook[] = [
  {
    id: "local-intent-refresh",
    label: "지역 검색 의도 명확화",
    summary: "김포·장기동 생활권 검색 의도와 페이지 메시지를 맞춥니다.",
    description: "지역성 표현, 치료 맥락, 방문/상담 의도를 메타·제목·도입부에 더 선명하게 반영합니다.",
    targetTypes: ["post", "page"],
    defaultSuggestionType: "title",
    difficulty: "low",
    applyMode: "auto",
    recommendedFor: ["지역 키워드 누락", "CTR 낮은 핵심 랜딩"],
    operatorPromptHint: "김포/장기동 생활권 검색 의도를 우선 반영하고 과장 표현은 피하세요.",
  },
  {
    id: "faq-expansion",
    label: "FAQ 확장",
    summary: "질문형 검색과 상담 전 불안을 줄일 FAQ를 보강합니다.",
    description: "실제 상담 전에 궁금해할 통증, 기간, 비용 범주의 질문을 한 개씩 추가합니다.",
    targetTypes: ["post", "page"],
    defaultSuggestionType: "faq",
    difficulty: "low",
    applyMode: "auto",
    recommendedFor: ["FAQ 부족", "질문형 검색 대응 필요"],
    operatorPromptHint: "불필요한 공포 표현 없이 실제 상담 전 궁금할 질문을 하나만 추가하세요.",
  },
  {
    id: "internal-link-cluster",
    label: "내부링크 보강",
    summary: "치료/칼럼 사이 이동 경로를 만들어 탐색 흐름을 강화합니다.",
    description: "관련 포스트와 치료 페이지를 서로 이어 탐색성과 체류 가능성을 높입니다.",
    targetTypes: ["post", "page"],
    defaultSuggestionType: "internal_links",
    difficulty: "low",
    applyMode: "auto",
    recommendedFor: ["관련 링크 부족", "콘텐츠 허브 강화"],
    operatorPromptHint: "이미 존재하는 관련 포스트/치료 링크만 사용하세요.",
  },
  {
    id: "snippet-refresh",
    label: "제목·요약문 정리",
    summary: "검색 결과에서 클릭을 막는 스니펫 문제를 바로잡습니다.",
    description: "제목이나 요약문이 모호하거나 너무 일반적일 때 클릭 전환용 스니펫을 다듬습니다.",
    targetTypes: ["post", "page"],
    defaultSuggestionType: "meta_description",
    difficulty: "low",
    applyMode: "auto",
    recommendedFor: ["노출 대비 CTR 낮음", "excerpt 약함"],
    operatorPromptHint: "검색 결과에서 이해하기 쉬운 한 문장 구조를 우선하세요.",
  },
  {
    id: "stale-refresh",
    label: "오래된 콘텐츠 정비",
    summary: "오래된 글/페이지 설명을 지금 기준으로 다시 다듬습니다.",
    description: "최신 표현, 상담 맥락, 핵심 문장을 보강해 낡은 인상을 줄입니다.",
    targetTypes: ["post", "page"],
    defaultSuggestionType: "body_revision",
    difficulty: "medium",
    applyMode: "manual",
    recommendedFor: ["오래된 콘텐츠", "설명 부족"],
    operatorPromptHint: "본문 전체를 뒤집지 말고 도입부와 요약 중심으로만 보강하세요.",
  },
];

function findPageTarget(targetId: string) {
  return PAGE_TARGETS.find((page) => page.id === targetId);
}

function getPlaybook(playbookId?: AiOpsPlaybookId | null) {
  return AI_OPS_PLAYBOOKS.find((playbook) => playbook.id === playbookId);
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
    return 55_000;
  }
  return Math.min(LLM_UPSTREAM_TIMEOUT_MS, 120_000);
}

function isTimeoutError(error: unknown) {
  return error instanceof Error
    && (error.name === "TimeoutError" || /aborted due to timeout/i.test(error.message));
}

function extractFirstJsonValue(text: string) {
  const start = text.search(/[\[{]/);
  if (start < 0) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    const expected = stack[stack.length - 1];
    if (char === expected) {
      stack.pop();
      if (stack.length === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const normalized = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    : trimmed;
  const withoutThinking = normalized.replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, "").trim();
  const candidates = Array.from(new Set([normalized, withoutThinking].filter(Boolean)));

  let parseError: unknown = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      parseError = error;
    }

    const extracted = extractFirstJsonValue(candidate);
    if (!extracted) continue;

    try {
      return JSON.parse(extracted) as T;
    } catch (error) {
      parseError = error;
    }
  }

  const preview = withoutThinking.slice(0, 120).replace(/\s+/g, " ");
  throw new Error(
    `AI 제안 생성 응답을 JSON으로 해석할 수 없습니다${preview ? `: ${preview}` : ""}`,
    { cause: parseError instanceof Error ? parseError : undefined },
  );
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

function getSuggestionMaxTokens(suggestionType: AiOpsSuggestionType) {
  if (suggestionType === "title") {
    return 256;
  }
  return 1024;
}

function buildLlmRequestBody(systemPrompt: string, userPrompt: string, suggestionType: AiOpsSuggestionType) {
  const body: Record<string, unknown> = {
    model: LLM_MODEL,
    stream: false,
    temperature: 0.4,
    max_tokens: getSuggestionMaxTokens(suggestionType),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (suggestionType === "title") {
    body.chat_template_kwargs = {
      enable_thinking: false,
    };
  }

  return body;
}

async function callJsonLlm<T>(
  systemPrompt: string,
  userPrompt: string,
  suggestionType: AiOpsSuggestionType,
): Promise<T> {
  try {
    const response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: getLlmHeaders(),
      body: JSON.stringify(buildLlmRequestBody(systemPrompt, userPrompt, suggestionType)),
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
  return period === "14d" ? "daily" : "weekly";
}

function normalizeDaysOld(date: string) {
  const today = new Date(getTodayKST());
  const then = new Date(date);
  return Math.max(0, Math.floor((today.getTime() - then.getTime()) / 86_400_000));
}

function buildIssue(code: string, label: string, detail: string): AiOpsCandidateIssue {
  return { code, label, detail };
}

function buildScoreFactor(label: string, score: number, detail: string): AiOpsScoreFactor {
  return { label, score, detail };
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

function toSearchPeriod(period: AiOpsBriefingPeriod) {
  return period === "60d" ? "90d" : "28d";
}

function toAnalyticsPeriod(period: AiOpsBriefingPeriod) {
  return period === "60d" ? "90d" : "30d";
}

function toConversionPeriod(period: AiOpsBriefingPeriod) {
  return period === "60d" ? "90d" : "30d";
}


async function loadSuggestionRows(limit = 120): Promise<SuggestionRow[]> {
  if (!isSupabaseAdminConfigured) return [];
  try {
    const { data, error } = await getSupabaseAdmin()
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as SuggestionRow[];
  } catch (error) {
    console.warn("[ai-ops] failed to load suggestion rows", error);
    return [];
  }
}

async function loadOpportunityDatasets(period: AiOpsBriefingPeriod): Promise<OpportunityDatasets> {
  const [posts, analyticsResult, searchResult, conversionResult, suggestionRows] = await Promise.all([
    getAllPostMetasFresh().catch(() => []),
    fetchGA4Data(toAnalyticsPeriod(period)).catch(() => null),
    fetchSearchConsoleData(toSearchPeriod(period)).catch(() => null),
    fetchPostHogConversion(toConversionPeriod(period)).catch(() => null),
    loadSuggestionRows(),
  ]);

  return {
    posts,
    analyticsResult,
    searchResult,
    conversionResult,
    suggestionRows,
  };
}

function findPageMetric(path: string, searchResult: OpportunityDatasets["searchResult"]): PageMetricsRow | null {
  if (!searchResult) return null;
  const rows = [...searchResult.topPages, ...searchResult.blogPages] as PageMetricsRow[];
  return rows.find((row) => row.page === path) ?? null;
}

function findSessionMetric(path: string, analyticsResult: OpportunityDatasets["analyticsResult"]) {
  if (!analyticsResult) return null;
  return analyticsResult.topPages.find((page) => page.path === path) ?? null;
}

function findConversionMetric(targetType: AiOpsTargetType, targetId: string, path: string, conversionResult: OpportunityDatasets["conversionResult"]) {
  if (!conversionResult?.configured) return null;
  if (targetType === "post") {
    return conversionResult.topBlogPosts.find((row) => row.slug === targetId) ?? null;
  }
  return conversionResult.topPages.find((row) => row.pagePath === path) ?? null;
}

function toObservationMetrics(params: {
  searchMetric: PageMetricsRow | null;
  sessionMetric: { sessions: number } | null;
  conversionMetric: { totalClicks: number; phoneClicks: number; contactClicks: number } | null;
  contactToPhoneRate: number | null;
}): AiOpsObservationMetrics {
  const ctaClicks = params.conversionMetric?.totalClicks ?? null;
  return {
    impressions: params.searchMetric?.impressions ?? null,
    clicks: params.searchMetric?.clicks ?? null,
    ctr: params.searchMetric?.ctr ?? null,
    position: params.searchMetric?.position ?? null,
    sessions: params.sessionMetric?.sessions ?? null,
    ctaClicks,
    phoneClicks: params.conversionMetric?.phoneClicks ?? null,
    contactClicks: params.conversionMetric?.contactClicks ?? null,
    contactToPhoneRate: params.contactToPhoneRate,
  };
}

function getTopQueries(path: string, searchResult: OpportunityDatasets["searchResult"]) {
  return searchResult?.pageTopQueries?.[path]?.map((item) => item.query) ?? [];
}

function toBlogPath(category: string, slug: string) {
  return `/blog/${category}/${slug}`;
}

function getTargetPath(context: TargetContext) {
  if (context.targetType === "post") {
    return toBlogPath(context.category, context.targetId);
  }
  return context.pagePath;
}

function getTargetPerformanceSnapshot(context: TargetContext, datasets: OpportunityDatasets): TargetPerformanceSnapshot {
  const path = getTargetPath(context);
  const searchMetric = findPageMetric(path, datasets.searchResult);
  const sessionMetric = findSessionMetric(path, datasets.analyticsResult);
  const conversionMetric = findConversionMetric(context.targetType, context.targetId, path, datasets.conversionResult);
  const topQueries = getTopQueries(path, datasets.searchResult);

  return {
    targetLabel: context.targetLabel,
    targetPath: path,
    metrics: toObservationMetrics({
      searchMetric,
      sessionMetric,
      conversionMetric,
      contactToPhoneRate: path === "/contact" ? datasets.conversionResult?.summary.contactToPhoneRate ?? null : null,
    }),
    topQueries,
  };
}

function getLastAppliedAt(targetType: AiOpsTargetType, targetId: string, suggestionRows: SuggestionRow[]) {
  return suggestionRows.find((row) => row.target_type === targetType && row.target_id === targetId && row.status === "applied")?.applied_at ?? null;
}

function resolveSignalState(lastAppliedAt: string | null, observationPlan: AiOpsObservationPlan | null): AiOpsSignalState {
  if (lastAppliedAt) {
    const daysSinceApplied = normalizeDaysOld(lastAppliedAt.slice(0, 10));
    if (daysSinceApplied < COOLDOWN_DAYS) {
      return "cooldown";
    }
    if (observationPlan && observationPlan.status !== "ready") {
      return "measuring";
    }
  }
  return "watch";
}

function buildPlaybookIdsForIssues(issues: AiOpsCandidateIssue[]) {
  const playbooks = new Set<AiOpsPlaybookId>();
  for (const issue of issues) {
    switch (issue.code) {
      case "low_ctr":
      case "weak_snippet":
      case "local_gap":
        playbooks.add("snippet-refresh");
        playbooks.add("local-intent-refresh");
        break;
      case "faq_gap":
        playbooks.add("faq-expansion");
        break;
      case "internal_links_gap":
        playbooks.add("internal-link-cluster");
        break;
      case "stale":
      case "thin_copy":
        playbooks.add("stale-refresh");
        break;
      default:
        playbooks.add("snippet-refresh");
    }
  }
  if (playbooks.size === 0) {
    playbooks.add("snippet-refresh");
  }
  return Array.from(playbooks);
}

function buildSuggestionTypesFromPlaybooks(playbooks: AiOpsPlaybookId[]) {
  return Array.from(new Set(playbooks.map((playbookId) => getPlaybook(playbookId)?.defaultSuggestionType ?? "meta_description")));
}

function chooseDifficulty(playbooks: AiOpsPlaybookId[]): AiOpsDifficulty {
  const difficulties = playbooks.map((playbookId) => getPlaybook(playbookId)?.difficulty ?? "low");
  if (difficulties.includes("high")) return "high";
  if (difficulties.includes("medium")) return "medium";
  return "low";
}

function hasLocalKeyword(texts: string[]) {
  const haystack = texts.join(" ");
  return LOCAL_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function buildCandidateForPost(
  post: OpportunityDatasets["posts"][number],
  datasets: OpportunityDatasets,
): AiOpsCandidate {
  const faqCount = 0;
  const relatedLinksCount = 0;
  const context: BlogTargetContext = {
    targetType: "post",
    targetId: post.slug,
    targetLabel: post.title,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    category: post.category,
    date: post.dateModified ?? post.date,
    blocks: [],
  };
  const performance = getTargetPerformanceSnapshot(context, datasets);
  const issues: AiOpsCandidateIssue[] = [];
  const factors: AiOpsScoreFactor[] = [];
  const notes: string[] = [];
  let score = 0;

  const ageDays = normalizeDaysOld(post.dateModified ?? post.date);
  if (ageDays >= 180) {
    score += 24;
    issues.push(buildIssue("stale", "오래된 콘텐츠", `최근 수정 후 ${ageDays}일이 지나 최신성이 약해졌습니다.`));
    factors.push(buildScoreFactor("콘텐츠 신선도", 24, `최근 수정 후 ${ageDays}일 경과`));
  } else if (ageDays >= 120) {
    score += 14;
    issues.push(buildIssue("stale", "정비 주기 도래", `최근 수정 후 ${ageDays}일이 지나 간단한 정비가 필요합니다.`));
    factors.push(buildScoreFactor("콘텐츠 신선도", 14, `최근 수정 후 ${ageDays}일 경과`));
  }

  if (post.excerpt.length < 90) {
    score += 18;
    issues.push(buildIssue("weak_snippet", "요약문 약함", "검색 결과에서 클릭을 만들 설명이 짧습니다."));
    factors.push(buildScoreFactor("구조적 결함", 18, `excerpt ${post.excerpt.length}자`));
  }

  if (faqCount === 0) {
    score += 16;
    issues.push(buildIssue("faq_gap", "FAQ 없음", "질문형 검색을 받을 FAQ 블록이 없습니다."));
    factors.push(buildScoreFactor("구조적 결함", 16, "FAQ 블록 0개"));
  }

  if (relatedLinksCount === 0) {
    score += 14;
    issues.push(buildIssue("internal_links_gap", "내부링크 부족", "관련 글/치료로 이어지는 탐색 링크가 없습니다."));
    factors.push(buildScoreFactor("탐색성", 14, "related links 0개"));
  }

  if (!hasLocalKeyword([post.title, post.subtitle, post.excerpt])) {
    score += 12;
    issues.push(buildIssue("local_gap", "지역 의도 약함", "김포·장기동 생활권 맥락이 스니펫에 드러나지 않습니다."));
    factors.push(buildScoreFactor("지역 SEO", 12, "지역 키워드 노출 부족"));
  }

  if ((performance.metrics.impressions ?? 0) >= 80 && (performance.metrics.ctr ?? 0) < 2.2) {
    score += 18;
    issues.push(buildIssue("low_ctr", "CTR 낮음", `노출 ${formatMetric(performance.metrics.impressions)} 대비 CTR ${formatPercent(performance.metrics.ctr)}`));
    factors.push(buildScoreFactor("검색 기회", 18, `노출 ${formatMetric(performance.metrics.impressions)} / CTR ${formatPercent(performance.metrics.ctr)}`));
  }

  if ((performance.metrics.position ?? 0) > 6.5) {
    score += 10;
    issues.push(buildIssue("position", "순위 보강 여지", `평균 순위 ${formatNumber(performance.metrics.position, 1)}위`));
    factors.push(buildScoreFactor("검색 기회", 10, `평균 순위 ${formatNumber(performance.metrics.position, 1)}위`));
  }

  if ((performance.metrics.ctaClicks ?? 0) > 0 && ((performance.metrics.phoneClicks ?? 0) + (performance.metrics.contactClicks ?? 0) <= 1)) {
    score += 6;
    notes.push("CTA 클릭은 있으나 후속 상담 신호는 약합니다.");
    factors.push(buildScoreFactor("전환 보조 신호", 6, `CTA ${formatMetric(performance.metrics.ctaClicks)}회`));
  }

  const lastAppliedAt = getLastAppliedAt("post", post.slug, datasets.suggestionRows);
  if (lastAppliedAt && normalizeDaysOld(lastAppliedAt.slice(0, 10)) < COOLDOWN_DAYS) {
    score -= 18;
    notes.push(`최근 ${normalizeDaysOld(lastAppliedAt.slice(0, 10))}일 내 반영된 작업이 있어 재추천을 완화했습니다.`);
    factors.push(buildScoreFactor("쿨다운", -18, "최근 반영 이력"));
  }

  if (issues.length === 0) {
    issues.push(buildIssue("monitor", "정기 점검", "급한 구조적 결함은 없지만 주기 점검 대상으로 유지합니다."));
  }

  const playbookIds = buildPlaybookIdsForIssues(issues);
  const difficulty = chooseDifficulty(playbookIds);
  const signalState = resolveSignalState(lastAppliedAt, null);
  const evidence: AiOpsEvidence = {
    summary: issues[0]?.detail ?? "정기 점검",
    scoreBreakdown: factors.length > 0 ? factors : [buildScoreFactor("정기 점검", 5, "낮은 강도의 개선 기회")],
    topQueries: performance.topQueries,
    metrics: performance.metrics,
    notes,
  };

  return {
    id: `post:${post.slug}`,
    targetType: "post",
    targetId: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    suggestionTypes: buildSuggestionTypesFromPlaybooks(playbookIds),
    playbookIds,
    priorityScore: clampScore(score || 8),
    primaryIssue: issues[0]?.label ?? "정기 점검",
    issues,
    difficulty,
    signalState,
    evidence,
    stats: {
      impressions: performance.metrics.impressions ?? undefined,
      ctr: performance.metrics.ctr ?? undefined,
      position: performance.metrics.position ?? undefined,
      clicks: performance.metrics.clicks ?? undefined,
      sessions: performance.metrics.sessions ?? undefined,
      ctaClicks: performance.metrics.ctaClicks ?? undefined,
      publishedDate: post.date,
      lastAppliedAt,
    },
  };
}

function buildCandidateForPage(page: PageTargetDefinition, datasets: OpportunityDatasets): AiOpsCandidate {
  const context: PageTargetContext = {
    targetType: "page",
    targetId: page.id,
    targetLabel: page.label,
    title: page.title,
    subtitle: page.subtitle,
    description: page.description,
    faqCount: page.faqCount,
    pagePath: page.pagePath,
  };
  const performance = getTargetPerformanceSnapshot(context, datasets);
  const issues: AiOpsCandidateIssue[] = [];
  const factors: AiOpsScoreFactor[] = [];
  const notes: string[] = [];
  let score = 0;

  if (!hasLocalKeyword([page.title, page.subtitle, page.description, page.note])) {
    score += 14;
    issues.push(buildIssue("local_gap", "지역 의도 약함", "페이지 설명에 김포·장기동 생활권 맥락이 약합니다."));
    factors.push(buildScoreFactor("지역 SEO", 14, "지역 키워드 노출 부족"));
  }

  if (page.faqCount === 0 && (page.pagePath === "/contact" || page.pagePath.includes("/treatments/"))) {
    score += 18;
    issues.push(buildIssue("faq_gap", "FAQ 보강 필요", "핵심 상담/치료 페이지인데 질문형 검색 대응이 약합니다."));
    factors.push(buildScoreFactor("구조적 결함", 18, `FAQ ${page.faqCount}개`));
  }

  if (page.description.length < 180) {
    score += 16;
    issues.push(buildIssue("thin_copy", "설명 부족", "핵심 문장이 짧아 검색 결과와 랜딩 메시지가 약합니다."));
    factors.push(buildScoreFactor("구조적 결함", 16, `${page.description.length}자 설명`));
  }

  if ((performance.metrics.impressions ?? 0) >= 120 && (performance.metrics.ctr ?? 0) < 2.8) {
    score += 18;
    issues.push(buildIssue("low_ctr", "CTR 낮음", `노출 ${formatMetric(performance.metrics.impressions)} 대비 CTR ${formatPercent(performance.metrics.ctr)}`));
    factors.push(buildScoreFactor("검색 기회", 18, `노출 ${formatMetric(performance.metrics.impressions)} / CTR ${formatPercent(performance.metrics.ctr)}`));
  }

  if ((performance.metrics.position ?? 0) > 5.5) {
    score += 10;
    issues.push(buildIssue("position", "순위 보강 여지", `평균 순위 ${formatNumber(performance.metrics.position, 1)}위`));
    factors.push(buildScoreFactor("검색 기회", 10, `평균 순위 ${formatNumber(performance.metrics.position, 1)}위`));
  }

  if (page.pagePath === "/contact") {
    score += 10;
    factors.push(buildScoreFactor("운영 우선순위", 10, "상담 랜딩 페이지 가중치"));
    if ((performance.metrics.contactToPhoneRate ?? 0) > 0 && (performance.metrics.contactToPhoneRate ?? 0) < 3) {
      score += 8;
      notes.push("상담 페이지 방문 대비 전화 클릭 비율이 낮아 문구 점검 가치가 있습니다.");
      factors.push(buildScoreFactor("전환 보조 신호", 8, `contact-to-phone ${formatPercent(performance.metrics.contactToPhoneRate)}`));
    }
  }

  if (page.pagePath === "/" || page.pagePath.startsWith("/treatments")) {
    score += 8;
    factors.push(buildScoreFactor("운영 우선순위", 8, "브랜드/핵심 치료 페이지 가중치"));
  }

  const lastAppliedAt = getLastAppliedAt("page", page.id, datasets.suggestionRows);
  if (lastAppliedAt && normalizeDaysOld(lastAppliedAt.slice(0, 10)) < COOLDOWN_DAYS) {
    score -= 18;
    notes.push(`최근 ${normalizeDaysOld(lastAppliedAt.slice(0, 10))}일 내 반영된 작업이 있어 재추천을 완화했습니다.`);
    factors.push(buildScoreFactor("쿨다운", -18, "최근 반영 이력"));
  }

  if (issues.length === 0) {
    issues.push(buildIssue("monitor", "정기 점검", "급한 구조적 결함은 없지만 핵심 랜딩으로서 정기 점검이 필요합니다."));
  }

  const playbookIds = buildPlaybookIdsForIssues(issues);
  const difficulty = chooseDifficulty(playbookIds);
  const signalState = resolveSignalState(lastAppliedAt, null);
  const evidence: AiOpsEvidence = {
    summary: issues[0]?.detail ?? "정기 점검",
    scoreBreakdown: factors.length > 0 ? factors : [buildScoreFactor("정기 점검", 5, "낮은 강도의 개선 기회")],
    topQueries: performance.topQueries,
    metrics: performance.metrics,
    notes,
  };

  return {
    id: `page:${page.id}`,
    targetType: "page",
    targetId: page.id,
    title: page.label,
    subtitle: page.subtitle,
    suggestionTypes: buildSuggestionTypesFromPlaybooks(playbookIds),
    playbookIds,
    priorityScore: clampScore(score || 8),
    primaryIssue: issues[0]?.label ?? "정기 점검",
    issues,
    difficulty,
    signalState,
    evidence,
    stats: {
      impressions: performance.metrics.impressions ?? undefined,
      ctr: performance.metrics.ctr ?? undefined,
      position: performance.metrics.position ?? undefined,
      clicks: performance.metrics.clicks ?? undefined,
      sessions: performance.metrics.sessions ?? undefined,
      ctaClicks: performance.metrics.ctaClicks ?? undefined,
      lastAppliedAt,
    },
  };
}

async function buildCandidates(period: AiOpsBriefingPeriod) {
  const datasets = await loadOpportunityDatasets(period);
  const blogCandidates = datasets.posts
    .map((post) => buildCandidateForPost(post, datasets))
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const pageCandidates = PAGE_TARGETS
    .map((page) => buildCandidateForPage(page, datasets))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    datasets,
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
      metrics_json: briefing,
      recommended_actions_json: briefing.todayTasks,
    });
  } catch (error) {
    console.warn("[ai-ops] failed to persist briefing", error);
  }
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("ko-KR");
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number | null | undefined, fractionDigits = 1) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(fractionDigits);
}

function toRecommendedAction(candidate: AiOpsCandidate): AiOpsRecommendedAction {
  const playbookId = candidate.playbookIds[0];
  const playbook = getPlaybook(playbookId);
  return {
    id: `${candidate.id}:${playbookId}`,
    title: `${candidate.title} · ${playbook?.label ?? "운영 작업"}`,
    description: candidate.evidence.summary,
    targetType: candidate.targetType,
    targetId: candidate.targetId,
    suggestionType: playbook?.defaultSuggestionType,
    playbookId,
    priorityScore: candidate.priorityScore,
    difficulty: candidate.difficulty,
  };
}

function summarizePendingSuggestion(row: SuggestionRow): AiOpsSuggestedSignalPending | null {
  if (!row.applied_at) return null;
  const plan = row.observation_plan_json;
  if (!plan?.checkpoints?.length) return null;

  const nextCheckpoint = plan.checkpoints.find((checkpoint) => new Date(checkpoint.targetDate).getTime() > Date.now());
  if (!nextCheckpoint) return null;

  const daysRemaining = Math.max(0, Math.ceil((new Date(nextCheckpoint.targetDate).getTime() - Date.now()) / 86_400_000));
  return {
    id: `pending-${row.id}-${nextCheckpoint.windowDays}`,
    suggestionId: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: formatTargetLabel(row.target_type, row.target_id),
    title: row.title,
    nextCheckpoint,
    daysRemaining,
    summary: row.reason,
  };
}

export async function getAiOpsBriefing(period: AiOpsBriefingPeriod): Promise<AiOpsBriefing> {
  const [{ datasets, blogCandidates, pageCandidates }, outcomes] = await Promise.all([
    buildCandidates(period),
    listAiOutcomes(8),
  ]);
  const topCandidates = [...blogCandidates.slice(0, 4), ...pageCandidates.slice(0, 4)]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);
  const todayTasks = topCandidates.slice(0, 3).map(toRecommendedAction);
  const recommendedActions = topCandidates.slice(0, 5).map(toRecommendedAction);
  const contentDebtQueue = [...blogCandidates]
    .filter((candidate) => candidate.issues.some((issue) => ["stale", "faq_gap", "internal_links_gap", "weak_snippet", "thin_copy", "local_gap"].includes(issue.code)))
    .slice(0, 6);
  const searchOpportunityQueue = [...topCandidates]
    .filter((candidate) => candidate.issues.some((issue) => ["low_ctr", "position", "local_gap"].includes(issue.code)))
    .slice(0, 6);
  const pendingObservation = outcomes.pending.slice(0, 6);
  const recentSignals = outcomes.items.slice(0, 6);

  const metrics: AiOpsMetricSnapshot = {
    sessions: datasets.analyticsResult?.summary.sessions.value ?? null,
    sessionsChange: datasets.analyticsResult?.summary.sessions.change ?? null,
    clicks: datasets.searchResult?.summary.clicks.value ?? null,
    clicksChange: datasets.searchResult?.summary.clicks.change ?? null,
    impressions: datasets.searchResult?.summary.impressions.value ?? null,
    impressionsChange: datasets.searchResult?.summary.impressions.change ?? null,
    postsNeedingAttention: blogCandidates.filter((item) => item.priorityScore >= 25).length,
    pagesNeedingAttention: pageCandidates.filter((item) => item.priorityScore >= 25).length,
    tasksReadyToday: todayTasks.length,
    signalsPendingReview: pendingObservation.length,
  };

  const headline = todayTasks.length > 0
    ? `지금 손보면 체감이 큰 운영 작업 ${todayTasks.length}건`
    : "지금 당장 급한 운영 위험은 크지 않습니다";
  const summary = [
    metrics.clicks !== null ? `검색 클릭 ${metrics.clicks.toLocaleString("ko-KR")}회` : "검색 클릭 데이터 부족",
    metrics.impressions !== null ? `노출 ${metrics.impressions.toLocaleString("ko-KR")}회` : "노출 데이터 부족",
    `콘텐츠 결함 후보 ${contentDebtQueue.length}건`,
    `관측 대기 ${pendingObservation.length}건`,
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
    todayTasks,
    contentDebtQueue,
    searchOpportunityQueue,
    pendingObservation,
    recentSignals,
  };

  void persistBriefing(briefing);
  return briefing;
}

export async function getAiOpsPlaybooks(): Promise<AiOpsPlaybook[]> {
  return AI_OPS_PLAYBOOKS;
}

export async function getAiOpsOpportunities(period: AiOpsBriefingPeriod, limit = 18): Promise<AiOpsOpportunityListResponse> {
  const { blogCandidates, pageCandidates } = await buildCandidates(period);
  return {
    opportunities: [...pageCandidates, ...blogCandidates]
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, Math.min(Math.max(limit, 1), 40)),
    playbooks: AI_OPS_PLAYBOOKS,
  };
}

export async function getAiOpsTargets(): Promise<AiOpsTargetOption[]> {
  const { blogCandidates, pageCandidates } = await buildCandidates("30d");
  return [
    ...blogCandidates.slice(0, 50).map((candidate) => ({
      id: candidate.targetId,
      label: candidate.title,
      targetType: "post" as const,
      note: `${candidate.primaryIssue} · ${candidate.difficulty === "low" ? "빠른 작업" : "검토 필요"}`,
      priorityScore: candidate.priorityScore,
      difficulty: candidate.difficulty,
      signalState: candidate.signalState,
      cooldownUntil: candidate.stats?.lastAppliedAt ?? null,
      lastAppliedAt: candidate.stats?.lastAppliedAt ?? null,
      recommendedPlaybooks: candidate.playbookIds,
    })),
    ...pageCandidates.map((candidate) => ({
      id: candidate.targetId,
      label: candidate.title,
      targetType: "page" as const,
      note: `${candidate.primaryIssue} · ${candidate.difficulty === "low" ? "빠른 작업" : "검토 필요"}`,
      priorityScore: candidate.priorityScore,
      difficulty: candidate.difficulty,
      signalState: candidate.signalState,
      cooldownUntil: candidate.stats?.lastAppliedAt ?? null,
      lastAppliedAt: candidate.stats?.lastAppliedAt ?? null,
      recommendedPlaybooks: candidate.playbookIds,
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
          title: `${context.title} 제목 개선안`,
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
          ? context.blocks.filter(isRelatedLinksBlock).flatMap((block) => block.items)
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
          title: `${context.title} 운영 제안`,
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
    `적용할 플레이북: ${promptContext.playbook?.label ?? "사용자 지정"}`,
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
  const llm = await callJsonLlm<Record<string, unknown>>(systemPrompt, userPrompt, suggestionType);
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

async function insertAction(suggestionId: number, action: Exclude<AiOpsActionType, "measure">, actorEmail: string, note?: string) {
  if (!isSupabaseAdminConfigured) return;
  await getSupabaseAdmin().from(ACTIONS_TABLE).insert({
    suggestion_id: suggestionId,
    action,
    actor_email: actorEmail,
    note: note?.trim() ? note.trim() : null,
  });
}

function mapSuggestionRow(row: SuggestionRow): AiOpsSuggestionListItem {
  const applyMode = row.apply_mode ?? (row.target_type === "post" && isSupportedApplyType(row.suggestion_type) ? "auto" : "manual");
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    suggestionType: row.suggestion_type,
    playbookId: row.playbook_id ?? null,
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
    targetLabel: formatTargetLabel(row.target_type, row.target_id),
    canApply: applyMode === "auto" && row.status === "approved",
    applyMode,
    evidence: row.evidence_json ?? null,
    observationPlan: row.observation_plan_json ?? null,
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

async function buildSuggestionPromptContext(
  context: TargetContext,
  input: Pick<CreateSuggestionInput, "targetType" | "targetId" | "context" | "playbookId">,
  candidateData: Awaited<ReturnType<typeof buildCandidates>>,
) {
  const candidate = [...candidateData.blogCandidates, ...candidateData.pageCandidates]
    .find((item) => item.targetType === input.targetType && item.targetId === input.targetId);
  const targetPath = getTargetPath(context);
  const representativeQueries = candidateData.datasets.searchResult?.pageTopQueries?.[targetPath]
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
      playbook: getPlaybook(input.playbookId),
    } satisfies SuggestionPromptContext,
    priorityScore: candidate?.priorityScore ?? 20,
    evidence: candidate?.evidence ?? null,
    applyMode: input.targetType === "page"
      ? "manual"
      : (getPlaybook(input.playbookId)?.applyMode ?? (isSupportedApplyType(candidate?.suggestionTypes?.[0] ?? "meta_description") ? "auto" : "manual")),
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
  const candidateData = await buildCandidates("30d");
  const { promptContext, priorityScore, evidence, applyMode } = await buildSuggestionPromptContext(context, input, candidateData);
  await options?.onProgress?.({
    stage: "generation",
    message: "AI가 제안 초안을 생성하고 있습니다.",
    metadata: { suggestionType: input.suggestionType, playbookId: input.playbookId },
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
      playbookId: input.playbookId ?? null,
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
      canApply: false,
      applyMode,
      evidence,
      observationPlan: null,
    };
  }

  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .insert({
      target_type: input.targetType,
      target_id: input.targetId,
      suggestion_type: input.suggestionType,
      playbook_id: input.playbookId ?? null,
      title: generated.title,
      before_json: generated.beforeJson,
      after_json: generated.afterJson,
      reason: generated.reason,
      priority_score: priorityScore,
      status: "draft",
      created_by: input.actorEmail,
      apply_mode: applyMode,
      evidence_json: evidence,
      observation_plan_json: null,
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

async function captureCurrentObservationMetrics(targetType: AiOpsTargetType, targetId: string): Promise<AiOpsObservationMetrics> {
  const context = await resolveTargetContext(targetType, targetId);
  const datasets = {
    posts: [] as Awaited<ReturnType<typeof getAllPostMetasFresh>>,
    analyticsResult: await fetchGA4Data("30d").catch(() => null),
    searchResult: await fetchSearchConsoleData("28d").catch(() => null),
    conversionResult: await fetchPostHogConversion("30d").catch(() => null),
    suggestionRows: [],
  } satisfies OpportunityDatasets;
  return getTargetPerformanceSnapshot(context, datasets).metrics;
}

function createObservationPlan(appliedAtIso: string, baseline: AiOpsObservationMetrics): AiOpsObservationPlan {
  const appliedAt = new Date(appliedAtIso);
  return {
    status: "active",
    baseline,
    checkpoints: OBSERVATION_WINDOWS.map((windowDays) => {
      const targetDate = new Date(appliedAt);
      targetDate.setDate(targetDate.getDate() + windowDays);
      return {
        windowDays,
        label: `${windowDays}일 관측`,
        targetDate: targetDate.toISOString(),
      };
    }),
    latestVerdict: null,
    latestMeasuredAt: null,
    confidenceNote: "표본이 적으면 판정 유보가 정상입니다.",
  };
}

export async function applyAiSuggestion({ id, actorEmail, note }: ActionInput): Promise<AiOpsSuggestionListItem> {
  const suggestion = await getSuggestionById(id);
  if (suggestion.status !== "approved") {
    throw new Error("승인된 제안만 반영할 수 있습니다");
  }
  const applyMode = suggestion.apply_mode ?? (suggestion.target_type === "post" && isSupportedApplyType(suggestion.suggestion_type) ? "auto" : "manual");
  if (applyMode !== "auto") {
    throw new Error("이 제안은 자동 반영 대신 수동 검토가 필요합니다");
  }

  if (suggestion.target_type !== "post") {
    if (suggestion.suggestion_type !== "title" && suggestion.suggestion_type !== "meta_description") {
      throw new Error("페이지 제안 중 자동 반영 가능한 유형만 지원합니다");
    }
    const now = new Date().toISOString();
    const baseline = await captureCurrentObservationMetrics(suggestion.target_type, suggestion.target_id);
    const observationPlan = createObservationPlan(now, baseline);
    const { data, error } = await getSupabaseAdmin()
      .from(SUGGESTIONS_TABLE)
      .update({ status: "applied", applied_at: now, applied_by: actorEmail, observation_plan_json: observationPlan })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    await insertAction(id, "apply", actorEmail, note ?? "페이지 메타 제안은 수동 반영 후 상태만 업데이트했습니다.");
    return mapSuggestionRow(data as SuggestionRow);
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
  const baseline = await captureCurrentObservationMetrics(suggestion.target_type, suggestion.target_id);
  const observationPlan = createObservationPlan(now, baseline);
  const { data, error } = await getSupabaseAdmin()
    .from(SUGGESTIONS_TABLE)
    .update({ status: "applied", applied_at: now, applied_by: actorEmail, observation_plan_json: observationPlan })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await insertAction(id, "apply", actorEmail, note);
  return mapSuggestionRow(data as SuggestionRow);
}

function deltaMetric(current: number | null, baseline: number | null) {
  if (current === null || baseline === null) return null;
  return Math.round((current - baseline) * 10) / 10;
}

function deltaPosition(current: number | null, baseline: number | null) {
  if (current === null || baseline === null) return null;
  return Math.round((baseline - current) * 10) / 10;
}

function buildSignalDelta(current: AiOpsObservationMetrics, baseline: AiOpsObservationMetrics | null) {
  if (!baseline) return {};
  return {
    impressions: deltaMetric(current.impressions, baseline.impressions),
    clicks: deltaMetric(current.clicks, baseline.clicks),
    ctr: deltaMetric(current.ctr, baseline.ctr),
    position: deltaPosition(current.position, baseline.position),
    sessions: deltaMetric(current.sessions, baseline.sessions),
    ctaClicks: deltaMetric(current.ctaClicks, baseline.ctaClicks),
    phoneClicks: deltaMetric(current.phoneClicks, baseline.phoneClicks),
    contactClicks: deltaMetric(current.contactClicks, baseline.contactClicks),
    contactToPhoneRate: deltaMetric(current.contactToPhoneRate, baseline.contactToPhoneRate),
  } satisfies Partial<Record<keyof AiOpsObservationMetrics, number | null>>;
}

function assessSignalVerdict(
  baseline: AiOpsObservationMetrics | null,
  observed: AiOpsObservationMetrics,
): { verdict: AiOpsSignalVerdict; summary: string; confidenceNote: string; delta: Partial<Record<keyof AiOpsObservationMetrics, number | null>> } {
  const delta = buildSignalDelta(observed, baseline);
  const impressionsMax = Math.max(baseline?.impressions ?? 0, observed.impressions ?? 0);
  const clicksMax = Math.max(baseline?.clicks ?? 0, observed.clicks ?? 0);
  const conversionMax = Math.max(
    baseline?.phoneClicks ?? 0,
    baseline?.contactClicks ?? 0,
    observed.phoneClicks ?? 0,
    observed.contactClicks ?? 0,
  );

  if (impressionsMax < 100 && clicksMax < 12 && conversionMax < 5) {
    return {
      verdict: "inconclusive",
      summary: "표본이 아직 작아 방향성을 확정하기 어렵습니다.",
      confidenceNote: "로컬 사이트 특성상 impression/click 표본이 더 쌓일 때까지 관측이 필요합니다.",
      delta,
    };
  }

  let positive = 0;
  let negative = 0;
  const notes: string[] = [];

  if ((delta.ctr ?? 0) >= 0.4) {
    positive += 1;
    notes.push(`CTR +${formatNumber(delta.ctr, 1)}%p`);
  }
  if ((delta.position ?? 0) >= 0.4) {
    positive += 1;
    notes.push(`평균 순위 ${formatNumber(delta.position, 1)}단계 개선`);
  }
  if ((delta.clicks ?? 0) >= 4) {
    positive += 1;
    notes.push(`클릭 +${formatMetric(delta.clicks)}`);
  }
  if ((delta.phoneClicks ?? 0) >= 2 || (delta.contactClicks ?? 0) >= 2) {
    positive += 1;
    notes.push("상담 신호 증가");
  }

  if ((delta.ctr ?? 0) <= -0.4) {
    negative += 1;
    notes.push(`CTR ${formatNumber(delta.ctr, 1)}%p`);
  }
  if ((delta.position ?? 0) <= -0.5) {
    negative += 1;
    notes.push(`평균 순위 ${formatNumber(delta.position, 1)}단계 하락`);
  }
  if ((delta.clicks ?? 0) <= -4) {
    negative += 1;
    notes.push(`클릭 ${formatMetric(delta.clicks)}`);
  }

  if (positive >= 2 && impressionsMax >= 180) {
    return {
      verdict: "strong_positive",
      summary: notes.slice(0, 2).join(" · ") || "긍정 신호가 비교적 분명합니다.",
      confidenceNote: "저트래픽 환경에서도 비교적 일관된 개선 신호가 확인되었습니다.",
      delta,
    };
  }
  if (positive >= 1) {
    return {
      verdict: "weak_positive",
      summary: notes[0] ?? "약한 개선 신호가 있습니다.",
      confidenceNote: "표본이 작아 과한 해석은 피하고 다음 체크포인트까지 함께 관측하세요.",
      delta,
    };
  }
  if (negative >= 2 && impressionsMax >= 180) {
    return {
      verdict: "strong_negative",
      summary: notes.slice(0, 2).join(" · ") || "부정 신호가 비교적 분명합니다.",
      confidenceNote: "최근 반영의 영향 가능성이 있으므로 우선순위를 낮추고 재검토하세요.",
      delta,
    };
  }
  if (negative >= 1) {
    return {
      verdict: "weak_negative",
      summary: notes[0] ?? "약한 악화 신호가 보입니다.",
      confidenceNote: "표본이 작아 확정은 어렵지만 다음 체크포인트까지 주의 관찰이 필요합니다.",
      delta,
    };
  }

  return {
    verdict: "inconclusive",
    summary: "뾰족한 개선/악화 신호 없이 관측 유지 단계입니다.",
    confidenceNote: "작은 사이트에서는 판정 유보가 정상 상태입니다.",
    delta,
  };
}

async function upsertOutcomeRecord(input: Omit<OutcomeRow, "id" | "created_at" | "updated_at">) {
  if (!isSupabaseAdminConfigured) return;
  try {
    await getSupabaseAdmin()
      .from(OUTCOMES_TABLE)
      .upsert({
        suggestion_id: input.suggestion_id,
        window_days: input.window_days,
        target_type: input.target_type,
        target_id: input.target_id,
        verdict: input.verdict,
        summary: input.summary,
        confidence_note: input.confidence_note,
        baseline_json: input.baseline_json,
        observed_json: input.observed_json,
        delta_json: input.delta_json,
        measured_at: input.measured_at,
      }, { onConflict: "suggestion_id,window_days" });
  } catch (error) {
    console.warn("[ai-ops] failed to upsert outcome record", error);
  }
}

function mapOutcomeRow(row: OutcomeRow, suggestion: SuggestionRow | undefined): AiOpsSignalItem {
  return {
    id: `signal-${row.suggestion_id}-${row.window_days}`,
    suggestionId: row.suggestion_id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: formatTargetLabel(row.target_type, row.target_id),
    title: suggestion?.title ?? "관측 신호",
    verdict: row.verdict,
    windowDays: row.window_days,
    measuredAt: row.measured_at,
    summary: row.summary,
    confidenceNote: row.confidence_note,
    baseline: row.baseline_json,
    observed: row.observed_json,
    delta: row.delta_json,
  };
}

export async function listAiOutcomes(limit = 20): Promise<AiOpsOutcomesResponse> {
  const suggestionRows = await loadSuggestionRows(80);
  const appliedSuggestions = suggestionRows.filter((row) => row.status === "applied" && row.applied_at);
  const pending: AiOpsSuggestedSignalPending[] = [];
  const computedSignals: AiOpsSignalItem[] = [];

  if (appliedSuggestions.length === 0) {
    return { items: [], pending: [] };
  }

  const datasets = {
    posts: [] as Awaited<ReturnType<typeof getAllPostMetasFresh>>,
    analyticsResult: await fetchGA4Data("30d").catch(() => null),
    searchResult: await fetchSearchConsoleData("28d").catch(() => null),
    conversionResult: await fetchPostHogConversion("30d").catch(() => null),
    suggestionRows,
  } satisfies OpportunityDatasets;

  for (const row of appliedSuggestions) {
    const plan = row.observation_plan_json;
    if (!plan?.baseline) continue;

    const planPending = summarizePendingSuggestion(row);
    if (planPending) pending.push(planPending);

    const context = await resolveTargetContext(row.target_type, row.target_id).catch(() => null);
    if (!context) continue;
    const observed = getTargetPerformanceSnapshot(context, datasets).metrics;

    for (const windowDays of OBSERVATION_WINDOWS) {
      const appliedAt = new Date(row.applied_at!);
      const readyAt = new Date(appliedAt);
      readyAt.setDate(readyAt.getDate() + windowDays);
      if (Date.now() < readyAt.getTime()) continue;

      const assessed = assessSignalVerdict(plan.baseline, observed);
      const signal: AiOpsSignalItem = {
        id: `signal-${row.id}-${windowDays}`,
        suggestionId: row.id,
        targetType: row.target_type,
        targetId: row.target_id,
        targetLabel: formatTargetLabel(row.target_type, row.target_id),
        title: row.title,
        verdict: assessed.verdict,
        windowDays,
        measuredAt: new Date().toISOString(),
        summary: assessed.summary,
        confidenceNote: assessed.confidenceNote,
        baseline: plan.baseline,
        observed,
        delta: assessed.delta,
      };
      computedSignals.push(signal);
      void upsertOutcomeRecord({
        suggestion_id: row.id,
        window_days: windowDays,
        target_type: row.target_type,
        target_id: row.target_id,
        verdict: assessed.verdict,
        summary: assessed.summary,
        confidence_note: assessed.confidenceNote,
        baseline_json: plan.baseline,
        observed_json: observed,
        delta_json: assessed.delta,
        measured_at: signal.measuredAt,
      });
    }
  }

  if (!isSupabaseAdminConfigured) {
    return {
      items: computedSignals
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, limit),
      pending: pending.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, limit),
    };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from(OUTCOMES_TABLE)
      .select("*")
      .order("measured_at", { ascending: false })
      .limit(limit * 3);
    if (error) throw error;

    const persisted = ((data ?? []) as OutcomeRow[]).map((row) => mapOutcomeRow(row, suggestionRows.find((item) => item.id === row.suggestion_id)));
    const merged = [...persisted, ...computedSignals].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    const deduped = merged.filter((item, index, arr) => arr.findIndex((candidate) => candidate.id === item.id) === index);
    return {
      items: deduped.slice(0, limit),
      pending: pending.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, limit),
    };
  } catch (error) {
    console.warn("[ai-ops] failed to read outcome rows", error);
    return {
      items: computedSignals
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, limit),
      pending: pending.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, limit),
    };
  }
}

export async function listAiActivity(limit = 30): Promise<AiOpsActivityItem[]> {
  const suggestionRows = await loadSuggestionRows(100);
  const outcomes = await listAiOutcomes(limit);

  if (!isSupabaseAdminConfigured) {
    return outcomes.items.slice(0, limit).map((item, index) => ({
      id: 1_000_000 + index,
      suggestionId: item.suggestionId,
      action: "measure",
      actorEmail: "system",
      note: item.summary,
      createdAt: item.measuredAt,
      suggestionTitle: item.title,
      suggestionType: null,
      targetType: item.targetType,
      targetId: item.targetId,
      targetLabel: item.targetLabel,
      signalVerdict: item.verdict,
      signalWindowDays: item.windowDays,
    }));
  }

  const [actionsRes] = await Promise.all([
    getSupabaseAdmin().from(ACTIONS_TABLE).select("*").order("created_at", { ascending: false }).limit(limit),
  ]);

  if (actionsRes.error) throw actionsRes.error;

  const actions = (actionsRes.data as ActionRow[]).flatMap((action) => {
    const suggestion = suggestionRows.find((item) => item.id === action.suggestion_id);
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
    } satisfies AiOpsActivityItem];
  });

  const measured = outcomes.items.map((item, index) => ({
    id: 9_000_000 + index,
    suggestionId: item.suggestionId,
    action: "measure" as const,
    actorEmail: "system",
    note: item.summary,
    createdAt: item.measuredAt,
    suggestionTitle: item.title,
    suggestionType: null,
    targetType: item.targetType,
    targetId: item.targetId,
    targetLabel: item.targetLabel,
    signalVerdict: item.verdict,
    signalWindowDays: item.windowDays,
  } satisfies AiOpsActivityItem));

  return [...actions, ...measured]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
