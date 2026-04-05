"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import type { AiOpsSuggestionJob, AiOpsSuggestionJobEvent } from "@/lib/admin-ai-ops-types";

const STORAGE_KEY = "born2smile-ai-ops-current-job";
const ACTIVE_JOB_POLL_MS = 5000;

interface SuggestionJobRow {
  id: number;
  job_type: "suggestion";
  target_type: AiOpsSuggestionJob["targetType"];
  target_id: string;
  suggestion_type: AiOpsSuggestionJob["suggestionType"];
  actor_email: string;
  context: string | null;
  payload_json: Record<string, unknown>;
  status: AiOpsSuggestionJob["status"];
  stage: AiOpsSuggestionJob["stage"];
  message: string;
  result_suggestion_id: number | null;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface SuggestionJobEventRow {
  id: number;
  job_id: number;
  status: AiOpsSuggestionJobEvent["status"];
  stage: AiOpsSuggestionJobEvent["stage"];
  message: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

function mapAiSuggestionJob(row: unknown): AiOpsSuggestionJob {
  const value = row as SuggestionJobRow;
  return {
    id: value.id,
    jobType: value.job_type,
    targetType: value.target_type,
    targetId: value.target_id,
    suggestionType: value.suggestion_type,
    actorEmail: value.actor_email,
    context: value.context,
    payloadJson: value.payload_json ?? {},
    status: value.status,
    stage: value.stage,
    message: value.message,
    resultSuggestionId: value.result_suggestion_id,
    lastError: value.last_error,
    createdAt: value.created_at,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    updatedAt: value.updated_at,
  };
}

function mapAiSuggestionJobEvent(row: unknown): AiOpsSuggestionJobEvent {
  const value = row as SuggestionJobEventRow;
  return {
    id: value.id,
    jobId: value.job_id,
    status: value.status,
    stage: value.stage,
    message: value.message,
    metadataJson: value.metadata_json ?? {},
    createdAt: value.created_at,
  };
}

function getStoredJobId() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  const jobId = Number(raw);
  return Number.isInteger(jobId) && jobId > 0 ? jobId : null;
}

function setStoredJobId(jobId: number | null) {
  if (typeof window === "undefined") return;
  if (jobId && jobId > 0) {
    window.sessionStorage.setItem(STORAGE_KEY, String(jobId));
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function sortEvents(events: AiOpsSuggestionJobEvent[]) {
  return [...events].sort((a, b) => a.id - b.id);
}

function isTerminalStatus(status: AiOpsSuggestionJob["status"] | undefined) {
  return status === "completed" || status === "failed";
}

export function useAiSuggestionJob() {
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [job, setJob] = useState<AiOpsSuggestionJob | null>(null);
  const [events, setEvents] = useState<AiOpsSuggestionJobEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    setCurrentJobId(getStoredJobId());
  }, []);

  useEffect(() => {
    setStoredJobId(currentJobId);
  }, [currentJobId]);

  const clearCurrentJob = useCallback(() => {
    setCurrentJobId(null);
    setJob(null);
    setEvents([]);
    setError(null);
  }, []);

  const bindJob = useCallback((nextJobId: number) => {
    setJob(null);
    setEvents([]);
    setCurrentJobId(nextJobId);
    setError(null);
  }, []);

  useEffect(() => {
    if (!currentJobId || !isSupabaseConfigured) {
      if (channelRef.current) {
        void getSupabaseBrowserClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    let active = true;
    const supabase = getSupabaseBrowserClient();

    async function loadSnapshot(showLoading: boolean) {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const [{ data: jobRow, error: jobError }, { data: eventRows, error: eventError }] = await Promise.all([
          supabase.from("ai_agent_jobs").select("*").eq("id", currentJobId).single(),
          supabase.from("ai_agent_job_events").select("*").eq("job_id", currentJobId).order("id", { ascending: true }),
        ]);

        if (jobError) throw jobError;
        if (eventError) throw eventError;
        if (!active) return;

        setJob(mapAiSuggestionJob(jobRow));
        setEvents(sortEvents((eventRows ?? []).map((row: unknown) => mapAiSuggestionJobEvent(row))));
        setError(null);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "잡 상태를 불러올 수 없습니다");
      } finally {
        if (active && showLoading) setLoading(false);
      }
    }

    void loadSnapshot(true);

    const channel = supabase
      .channel(`ai-ops-job-${currentJobId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "ai_agent_jobs",
        filter: `id=eq.${currentJobId}`,
      }, (payload: { new: unknown }) => {
        if (!active || !payload.new) return;
        setJob(mapAiSuggestionJob(payload.new));
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ai_agent_job_events",
        filter: `job_id=eq.${currentJobId}`,
      }, (payload: { new: unknown }) => {
        if (!active || !payload.new) return;
        const nextEvent = mapAiSuggestionJobEvent(payload.new);
        setEvents((prev) => {
          if (prev.some((item) => item.id === nextEvent.id)) return prev;
          return sortEvents([...prev, nextEvent]);
        });
      })
      .subscribe();

    channelRef.current = channel;
    const pollTimer = window.setInterval(() => {
      if (!active || isTerminalStatus(job?.status)) return;
      void loadSnapshot(false);
    }, ACTIVE_JOB_POLL_MS);

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentJobId, job?.status]);

  const derivedState = useMemo(() => ({
    currentJobId,
    job,
    events,
    loading,
    error,
    bindJob,
    clearCurrentJob,
  }), [bindJob, clearCurrentJob, currentJobId, error, events, job, loading]);

  return derivedState;
}
