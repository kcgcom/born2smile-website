"use client";

import { useState, useCallback } from "react";
import useSWR, { preload, mutate as globalMutate } from "swr";
import { getFirebaseAuth } from "@/lib/firebase";

// -------------------------------------------------------------
// SWR fetcher — Firebase Auth 토큰 주입
// -------------------------------------------------------------

async function adminFetcher<T>(endpoint: string): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("로그인이 필요합니다");
  const token = await user.getIdToken();
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "데이터를 불러올 수 없습니다" }));
    throw new Error(err.message ?? "데이터를 불러올 수 없습니다");
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

// PageSpeed 등 느린 엔드포인트 판별
const SLOW_ENDPOINTS = ["/api/dev/pagespeed"];

function isSlowEndpoint(endpoint: string): boolean {
  return SLOW_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

// -------------------------------------------------------------
// useAdminApi — 기존 인터페이스 완전 보존
// { data: T | null, loading: boolean, error: string | null, refetch: () => void }
// -------------------------------------------------------------

export function useAdminApi<T>(endpoint: string, enabled: boolean = true) {
  const slow = isSlowEndpoint(endpoint);

  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR<T>(
    enabled ? endpoint : null,
    adminFetcher<T>,
    {
      dedupingInterval: slow ? 6 * 60 * 60 * 1000 : 30_000,
      revalidateOnFocus: !slow,
      ...(slow && { keepPreviousData: true }),
    },
  );

  const refetch = useCallback(() => { mutate(); }, [mutate]);

  return {
    data: data ?? null,
    loading: isLoading,
    isValidating,
    error: swrError ? (swrError instanceof Error ? swrError.message : "알 수 없는 오류") : null,
    refetch,
  };
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
    method: "POST" | "PUT" | "DELETE",
    body?: unknown,
  ): Promise<{ data: T | null; error: string | null }> => {
    setLoading(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("로그인이 필요합니다");
      const token = await user.getIdToken();
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
