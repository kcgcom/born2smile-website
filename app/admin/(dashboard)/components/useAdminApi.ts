"use client";

import { useState, useEffect, useCallback } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

export function useAdminApi<T>(endpoint: string, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) {
        throw new Error("로그인이 필요합니다");
      }
      const token = await user.getIdToken();
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "데이터를 불러올 수 없습니다" }));
        throw new Error(err.message ?? "데이터를 불러올 수 없습니다");
      }
      const json = await res.json();
      setData(json.data ?? json);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [enabled, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

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
