"use client";

import { useState, useEffect, useCallback } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

export function useAdminApi<T>(endpoint: string, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "데이터를 불러올 수 없습니다" }));
        throw new Error(err.message ?? "데이터를 불러올 수 없습니다");
      }
      const json = await res.json();
      setData(json.data ?? json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (enabled) fetchData();
  }, [enabled, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
