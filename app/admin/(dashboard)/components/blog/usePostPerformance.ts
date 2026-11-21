"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  PERFORMANCE_SOURCES,
  type PerformanceSourceKey,
  type PerformanceUpdate,
} from "@/lib/post-performance";
import { readAdminUpdates } from "../readAdminUpdates";

type PerformanceView = PerformanceUpdate & { failed?: PerformanceSourceKey[] };

function mergeUpdate(current: PerformanceView, update: PerformanceUpdate): PerformanceView {
  const next = { ...current, ...update, sourceTimes: { ...current.sourceTimes, ...update.sourceTimes } };
  const failed = new Set(current.failed);
  for (const key of PERFORMANCE_SOURCES) {
    if (key === "previousSearch") {
      if (!update.previousSearch) continue;
      if (update.previousSearchStatus === "error") {
        failed.add(key);
        if (current.previousSearch?.clicks != null) next.previousSearch = current.previousSearch;
      } else {
        failed.delete(key);
      }
      continue;
    }
    const source = update[key];
    if (!source) continue;
    if (source.status === "error") {
      failed.add(key);
      if (current[key]?.status === "ready") Object.assign(next, { [key]: current[key] });
    } else if ((key === "search" && update.search?.data?.queriesAvailable === false)
      || (key === "reading" && update.reading?.data?.warnings?.length)) {
      failed.add(key);
    } else {
      failed.delete(key);
      if (source.status !== "ready") delete next.sourceTimes[key];
    }
  }
  return { ...next, failed: [...failed] };
}

async function readPerformance(
  endpoint: string,
  onUpdate: (update: PerformanceUpdate) => void,
) {
  return readAdminUpdates(endpoint, onUpdate, data => ({
    ...data,
    sourceTimes: Object.fromEntries(
      PERFORMANCE_SOURCES.filter(key => key === "previousSearch"
        ? data.previousSearch?.clicks != null
        : data[key]?.status === "ready").map(key => [key, data.fetchedAt]),
    ),
  }));
}

export function usePostPerformance(endpoint: string, enabled: boolean, asOf: string) {
  const key = enabled ? `${endpoint}&asOf=${asOf}` : null;
  const { cache } = useSWRConfig();
  const [progress, setProgress] = useState<Record<string, PerformanceView>>({});
  const [retry, setRetry] = useState<{ key: string; source: PerformanceSourceKey } | null>(null);
  const [retryError, setRetryError] = useState<{ key: string; message: string } | null>(null);
  async function load(url: string, initial: PerformanceView = {}, source?: PerformanceSourceKey) {
    let report = initial;
    await readPerformance(source ? `${url}&source=${source}` : url, update => {
      report = mergeUpdate(report, update);
      const snapshot = report;
      setProgress(current => ({ ...current, [url]: snapshot }));
    });
    return report;
  }
  const { data, error, isValidating, mutate } = useSWR<PerformanceView>(
    key, url => load(url, progress[url] ?? cache.get(url)?.data),
    { revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false },
  );
  const report = key ? progress[key] ?? data : undefined;
  const retrying = retry?.key === key ? retry.source : null;
  function refetch() {
    setRetryError(null);
    void mutate().catch(() => {});
  }
  async function retrySource(source: PerformanceSourceKey) {
    if (!key || retry || isValidating) return;
    setRetryError(null);
    setRetry({ key, source });
    try {
      await mutate(load(key, report, source), { revalidate: false });
    } catch (error) {
      setRetryError({ key, message: error instanceof Error ? error.message : "성과를 다시 조회하지 못했습니다." });
    } finally {
      setRetry(null);
    }
  }
  return {
    report,
    updating: isValidating || retrying !== null,
    error: (retryError?.key === key ? retryError.message : null) ?? error?.message,
    refetch,
    retrySource,
  };
}
