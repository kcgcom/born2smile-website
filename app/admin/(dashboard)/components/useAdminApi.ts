"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR, { preload, mutate as globalMutate } from "swr";
import { getAccessToken } from "@/lib/supabase";

// -------------------------------------------------------------
// SWR fetcher — Supabase Auth 토큰 주입
// -------------------------------------------------------------

async function adminFetcher<T>(endpoint: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(endpoint, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "데이터를 불러올 수 없습니다" }));
    throw new Error(err.message ?? "데이터를 불러올 수 없습니다");
  }
  const json = await res.json();
  // "data" 키가 있으면 그 값을 반환 (null 포함), 없으면 전체 json 반환
  return ("data" in json ? json.data : json) as T;
}

// 느린 엔드포인트 — 짧은 세션 캐시를 먼저 보여주고 최신 응답 확인
const SLOW_ENDPOINTS = [
  "/api/dev/pagespeed",
  "/api/admin/naver-datalab/trend-summary",
  "/api/admin/analytics",
  "/api/admin/blog-analytics",
  "/api/admin/indexing-status",
];

const KEEP_PREVIOUS_ENDPOINTS = [
  "/api/admin/posthog/conversion",
];

function isSlowEndpoint(endpoint: string): boolean {
  return SLOW_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

function needsFreshAnalytics(endpoint: string): boolean {
  return ["/api/admin/analytics", "/api/admin/blog-analytics", "/api/admin/indexing-status"].some(path => endpoint.startsWith(path));
}

function shouldKeepPreviousData(endpoint: string): boolean {
  return (isSlowEndpoint(endpoint) && !needsFreshAnalytics(endpoint))
    || KEEP_PREVIOUS_ENDPOINTS.some((path) => endpoint.startsWith(path));
}

// -------------------------------------------------------------
// sessionStorage 캐시 — 유효 시간과 KST 날짜를 확인한 응답만 재사용
// -------------------------------------------------------------

const SESSION_CACHE_PREFIX = "swr:v2:";
const SESSION_CACHE_TTL = 5 * 60 * 1000;

function getSessionData<T>(endpoint: string): { data: T; savedAt: number } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_PREFIX + endpoint);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as { data: T; savedAt: number };
    const age = Date.now() - entry.savedAt;
    const kstDay = (time: number) => new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!Number.isFinite(entry.savedAt) || age < 0 || age > (needsFreshAnalytics(endpoint) ? SESSION_CACHE_TTL : 6 * 60 * 60 * 1000) || kstDay(entry.savedAt) !== kstDay(Date.now())) return undefined;
    return entry;
  } catch {
    return undefined;
  }
}

function setSessionData(endpoint: string, data: unknown) {
  try {
    sessionStorage.setItem(SESSION_CACHE_PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // 용량 초과 시 무시
  }
}

// -------------------------------------------------------------
// useAdminApi — 기존 인터페이스 완전 보존
// { data: T | null, loading: boolean, error: string | null, refetch: () => void }
// -------------------------------------------------------------

export function useAdminApi<T>(endpoint: string, enabled: boolean = true) {
  const slow = isSlowEndpoint(endpoint);
  const keepPrevious = shouldKeepPreviousData(endpoint);
  const freshAnalytics = needsFreshAnalytics(endpoint);
  const cached = useMemo(() => slow ? getSessionData<T>(endpoint) : undefined, [endpoint, slow]);
  const [lastResponse, setLastResponse] = useState<{ endpoint: string; at: number } | null>(null);

  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR<T>(
    enabled ? endpoint : null,
    adminFetcher<T>,
    {
      dedupingInterval: freshAnalytics ? 60_000 : slow ? 6 * 60 * 60 * 1000 : 30_000,
      revalidateOnFocus: !slow || freshAnalytics,
      keepPreviousData: keepPrevious,
      fallbackData: cached?.data,
      ...(freshAnalytics && { revalidateOnMount: true, refreshInterval: 5 * 60 * 1000 }),
      onSuccess: (d: T) => {
        setLastResponse({ endpoint, at: Date.now() });
        if (slow || keepPrevious) setSessionData(endpoint, d);
      },
    },
  );

  const refetch = useCallback(() => {
    // SWR mutate can reject on revalidation errors. Keep the failure in hook state
    // instead of letting an unhandled promise trip the route error boundary.
    void mutate().catch(() => {});
  }, [mutate]);

  return {
    data: data ?? null,
    loading: isLoading && data === undefined,
    isValidating,
    updatedAt: lastResponse?.endpoint === endpoint ? lastResponse.at : cached?.savedAt ?? null,
    error: swrError ? (swrError instanceof Error ? swrError.message : "알 수 없는 오류") : null,
    refetch,
  };
}

// -------------------------------------------------------------
// forceRefetchAdminApi — 서버 캐시까지 우회하여 최신 데이터 가져오기
// endpoint에 force=true를 붙여 서버 캐시 우회 후, SWR 캐시 + sessionStorage 갱신
// -------------------------------------------------------------

export async function forceRefetchAdminApi<T>(endpoint: string): Promise<T> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const forceEndpoint = `${endpoint}${separator}force=true`;
  const data = await adminFetcher<T>(forceEndpoint);
  // SWR 캐시 갱신 (원래 endpoint 키)
  await globalMutate(endpoint, data, false);
  // sessionStorage 갱신
  setSessionData(endpoint, data);
  return data;
}

// -------------------------------------------------------------
// preloadAdminApi — 호버 프리페치용
// -------------------------------------------------------------

export function preloadAdminApi(endpoint: string) {
  preload(endpoint, adminFetcher);
}

// -------------------------------------------------------------
// useAdminMutation — 뮤테이션 후 SWR 캐시 자동 무효화
// -------------------------------------------------------------

export function useAdminMutation<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    endpoint: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<{ data: T | null; error: string | null }> => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "요청을 처리할 수 없습니다" }));
        throw new Error(err.message ?? "요청을 처리할 수 없습니다");
      }
      const json = await res.json();
      const data = (json.data ?? json) as T;

      // 뮤테이션 성공 시 해당 엔드포인트의 SWR 캐시 무효화
      await globalMutate(endpoint);

      return { data, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(msg);
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, clearError: () => setError(null) };
}
