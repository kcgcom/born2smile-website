"use client";

import * as Sentry from "@sentry/nextjs";
import { Activity, CheckCircle2, ExternalLink, Loader2, Siren, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminActionButton, AdminActionLink, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminErrorState } from "./AdminErrorState";
import { useAdminApi, useAdminMutation } from "./useAdminApi";

interface EnvStatusData {
  variables: {
    key: string;
    label: string;
    configured: boolean;
    required: boolean;
    scope: "public" | "private";
  }[];
  summary: {
    total: number;
    configured: number;
    missing: number;
  };
}

interface SentryTestResponse {
  ok: boolean;
  eventId: string;
  timestamp: string;
}

interface PostHogHealthData {
  env: {
    tokenConfigured: boolean;
    hostConfigured: boolean;
    projectIdConfigured: boolean;
    apiKeyConfigured: boolean;
  };
  summary: {
    events24h: number | null;
    ctaEvents24h: number | null;
    lastEventAt: string | null;
    healthy: boolean;
  };
  links: {
    overview: string | null;
    events: string | null;
    insights: string | null;
    funnels: string | null;
  };
}

const REQUIRED_SENTRY_KEYS = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "SENTRY_AUTH_TOKEN",
] as const;

export function MonitoringTab() {
  const [clientLoading, setClientLoading] = useState(false);
  const [clientEventId, setClientEventId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const {
    data: envData,
    loading: envLoading,
    error: envError,
    refetch: refetchEnv,
  } = useAdminApi<EnvStatusData>("/api/dev/env-status");
  const {
    mutate,
    loading: serverLoading,
    error: serverError,
    clearError: clearServerError,
  } = useAdminMutation<SentryTestResponse>();
  const [serverEventId, setServerEventId] = useState<string | null>(null);
  const {
    data: postHogData,
    loading: postHogLoading,
    error: postHogError,
    refetch: refetchPostHog,
  } = useAdminApi<PostHogHealthData>("/api/admin/posthog/health");

  const sentryEnv = useMemo(() => {
    const variables = envData?.variables ?? [];
    return REQUIRED_SENTRY_KEYS.map((key) => {
      const found = variables.find((variable) => variable.key === key);
      return {
        key,
        label: found?.label ?? key,
        configured: found?.configured ?? false,
      };
    });
  }, [envData]);

  const readyCount = sentryEnv.filter((item) => item.configured).length;
  const isReady = sentryEnv.every((item) => item.configured);

  async function sendClientTestEvent() {
    setClientLoading(true);
    setClientError(null);
    setClientEventId(null);

    try {
      const error = new Error(`[sentry-test] 클라이언트 테스트 이벤트 (${new Date().toISOString()})`);
      const eventId = Sentry.captureException(error, {
        level: "error",
        tags: {
          source: "admin-dev-sentry-test",
          runtime: "client",
        },
      });

      const flushed = await Sentry.flush(2000);
      if (!flushed) {
        throw new Error("Sentry 전송 대기 시간이 초과되었습니다");
      }

      setClientEventId(eventId);
    } catch (error) {
      setClientError(
        error instanceof Error ? error.message : "클라이언트 테스트 이벤트 전송에 실패했습니다",
      );
    } finally {
      setClientLoading(false);
    }
  }

  async function sendServerTestEvent() {
    clearServerError();
    setServerEventId(null);

    const result = await mutate("/api/dev/sentry-test", "POST");
    if (result.data?.eventId) {
      setServerEventId(result.data.eventId);
    }
  }

  if (envLoading) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminSurface>
    );
  }

  if (envError) {
    return <AdminErrorState message={envError} onRetry={refetchEnv} />;
  }

  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--color-primary)]" />
              <h3 className="text-base font-semibold text-slate-900">
                Sentry 모니터링 상태
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              환경변수 설정과 실제 테스트 이벤트 전송을 한 화면에서 점검합니다.
            </p>
          </div>
          <AdminPill tone={isReady ? "white" : "warning"}>
            {readyCount}/{sentryEnv.length} 준비됨
          </AdminPill>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {sentryEnv.map((item) => (
            <div
              key={item.key}
              className={`rounded-2xl border px-4 py-3 ${
                item.configured
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {item.configured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TriangleAlert className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.key}</p>
            </div>
          ))}
        </div>

        {!isReady && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Vercel 프로젝트 설정에서 위 4개 값을 먼저 입력하세요. 입력 후 새 배포가 필요합니다.
          </div>
        )}
      </AdminSurface>

      <AdminSurface tone="white" className="rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Siren className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-base font-semibold text-slate-900">
            테스트 이벤트 전송
          </h3>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          클라이언트/서버 각각에서 Sentry 이벤트를 전송해 실제 수집 여부를 확인합니다.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-900">클라이언트 이벤트</h4>
            <p className="mt-1 text-sm text-slate-600">
              브라우저 런타임에서 직접 예외를 전송합니다.
            </p>
            <AdminActionButton
              tone="primary"
              className="mt-4"
              onClick={sendClientTestEvent}
              disabled={!isReady || clientLoading}
            >
              {clientLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              클라이언트 테스트 보내기
            </AdminActionButton>
            {clientEventId && (
              <p className="mt-3 text-xs text-emerald-700">
                전송 완료: <span className="font-mono">{clientEventId}</span>
              </p>
            )}
            {clientError && (
              <p className="mt-3 text-xs text-red-600">{clientError}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-sm font-semibold text-slate-900">서버 이벤트</h4>
            <p className="mt-1 text-sm text-slate-600">
              관리자 인증이 필요한 API에서 서버 예외를 전송합니다.
            </p>
            <AdminActionButton
              tone="dark"
              className="mt-4"
              onClick={sendServerTestEvent}
              disabled={!isReady || serverLoading}
            >
              {serverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              서버 테스트 보내기
            </AdminActionButton>
            {serverEventId && (
              <p className="mt-3 text-xs text-emerald-700">
                전송 완료: <span className="font-mono">{serverEventId}</span>
              </p>
            )}
            {serverError && (
              <p className="mt-3 text-xs text-red-600">{serverError}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <AdminActionLink
            href="https://sentry.io/issues/"
            target="_blank"
            rel="noreferrer"
            tone="dark"
          >
            Sentry Issues 열기
            <ExternalLink className="h-4 w-4" />
          </AdminActionLink>
        </div>
      </AdminSurface>

      <PostHogSection
        data={postHogData}
        loading={postHogLoading}
        error={postHogError}
        onRetry={refetchPostHog}
      />
    </div>
  );
}

function PostHogSection({
  data,
  loading,
  error,
  onRetry,
}: {
  data: PostHogHealthData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <AdminSurface tone="white" className="rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminSurface>
    );
  }

  if (error) {
    return <AdminErrorState message={error} onRetry={onRetry} />;
  }

  if (!data) return null;

  const readyCount = Object.values(data.env).filter(Boolean).length;
  const isReady = Object.values(data.env).every(Boolean);

  const envItems = [
    {
      key: "NEXT_PUBLIC_POSTHOG_TOKEN",
      label: "PostHog 공개 토큰",
      configured: data.env.tokenConfigured,
    },
    {
      key: "NEXT_PUBLIC_POSTHOG_HOST",
      label: "PostHog 수집 호스트",
      configured: data.env.hostConfigured,
    },
    {
      key: "POSTHOG_PROJECT_ID",
      label: "PostHog Project ID",
      configured: data.env.projectIdConfigured,
    },
    {
      key: "POSTHOG_API_KEY",
      label: "PostHog API Key",
      configured: data.env.apiKeyConfigured,
    },
  ];

  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="text-base font-semibold text-slate-900">
              PostHog 수집 상태
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            CTA/상담 전환 이벤트 수집과 관리자 조회용 설정 상태를 점검합니다.
          </p>
        </div>
        <AdminPill tone={isReady ? "white" : "warning"}>
          {readyCount}/{envItems.length} 준비됨
        </AdminPill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {envItems.map((item) => (
          <div
            key={item.key}
            className={`rounded-2xl border px-4 py-3 ${
              item.configured
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {item.configured ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-sm font-medium text-slate-900">{item.label}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.key}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="최근 24시간 이벤트"
          value={
            data.summary.events24h === null
              ? "—"
              : data.summary.events24h.toLocaleString("ko-KR")
          }
        />
        <SummaryCard
          label="최근 24시간 CTA"
          value={
            data.summary.ctaEvents24h === null
              ? "—"
              : data.summary.ctaEvents24h.toLocaleString("ko-KR")
          }
        />
        <SummaryCard
          label="마지막 이벤트"
          value={data.summary.lastEventAt ? formatCompactDate(data.summary.lastEventAt) : "—"}
        />
      </div>

      {!isReady && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          관리자 리포트까지 보려면 `POSTHOG_PROJECT_ID`와 `POSTHOG_API_KEY`를 추가로 설정해야 합니다.
        </div>
      )}

      {isReady && !data.summary.healthy && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          최근 24시간 내 이벤트가 없습니다. 실제 사이트에서 CTA를 클릭한 뒤 다시 확인해 주세요.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {data.links.overview && (
          <AdminActionLink href={data.links.overview} target="_blank" rel="noreferrer" tone="dark">
            PostHog 열기
            <ExternalLink className="h-4 w-4" />
          </AdminActionLink>
        )}
        {data.links.events && (
          <AdminActionLink href={data.links.events} target="_blank" rel="noreferrer" tone="dark">
            Events
            <ExternalLink className="h-4 w-4" />
          </AdminActionLink>
        )}
        {data.links.insights && (
          <AdminActionLink href={data.links.insights} target="_blank" rel="noreferrer" tone="dark">
            Insights
            <ExternalLink className="h-4 w-4" />
          </AdminActionLink>
        )}
        {data.links.funnels && (
          <AdminActionLink href={data.links.funnels} target="_blank" rel="noreferrer" tone="dark">
            Funnels
            <ExternalLink className="h-4 w-4" />
          </AdminActionLink>
        )}
      </div>
    </AdminSurface>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatCompactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
