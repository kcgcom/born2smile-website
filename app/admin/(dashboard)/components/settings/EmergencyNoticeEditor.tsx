"use client";

import { useRef, useState } from "react";
import type { EmergencyNotice } from "@/lib/emergency-notice";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

const ENDPOINT = "/api/admin/emergency-notice";
const timeFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

export function EmergencyNoticeEditor() {
  const { data, loading, error, refetch, updatedAt } = useAdminApi<{ notice: EmergencyNotice | null }>(ENDPOINT);
  const { mutate, loading: saving } = useAdminMutation<{ notice: EmergencyNotice | null }>();
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string }>();
  const [result, setResult] = useState<{ notice: EmergencyNotice | null; at: number }>();
  const pending = useRef(false);
  const candidate = message.trim();
  const active = (result && result.at >= (updatedAt ?? 0) ? result : data)?.notice;

  async function save(method: "PUT" | "DELETE") {
    if (pending.current) return;
    const expiration = expiresAt.length === 16 ? expiresAt + ":00+09:00" : expiresAt + "+09:00";
    if (method === "PUT" && (!candidate || !(Date.parse(expiration) > Date.now()))) {
      setFeedback({ error: true, message: "공지 문구와 미래의 종료 시각을 입력해 주세요." });
      return;
    }

    pending.current = true;
    setFeedback(undefined);
    const response = await mutate(ENDPOINT, method, method === "PUT" ? { message: candidate, expiresAt: expiration } : undefined);
    pending.current = false;
    if (response.error) {
      setFeedback({ error: true, message: response.error });
      return;
    }
    if (response.data) setResult({ ...response.data, at: Date.now() });
    setMessage("");
    setExpiresAt("");
    setFeedback({ error: false, message: method === "PUT" ? "긴급 공지를 게시했습니다." : "긴급 공지를 내렸습니다." });
  }

  return (
    <section aria-labelledby="emergency-notice-heading" className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 id="emergency-notice-heading" className="font-semibold">긴급 공지</h3>
      <p className="text-sm text-[var(--muted)]">홈페이지와 상담 안내 상단에 표시되며, 종료 시각에 자동으로 내려갑니다.</p>
      {loading && <p role="status" className="text-sm">현재 공지를 불러오는 중…</p>}
      {error && <div className="flex flex-wrap items-center gap-2">
        <AdminNotice tone="warning">현재 공지를 불러오지 못했습니다.</AdminNotice>
        <AdminActionButton tone="ghost" onClick={() => { setResult(undefined); refetch(); }}>다시 확인</AdminActionButton>
      </div>}
      {active && (
        <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
          <p className="font-medium">게시된 공지</p>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{active.message}</p>
          <p>종료 {timeFormat.format(new Date(active.expiresAt))} (한국 시간)</p>
        </div>
      )}
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save("PUT"); }}>
        <label className="block space-y-1 text-sm">
          <span className="block font-medium">공지 문구</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={240}
            disabled={saving} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="block font-medium">종료 시각 (한국 시간)</span>
          <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)}
            required disabled={saving} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 sm:w-auto" />
        </label>
        {candidate && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">미리보기</p>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{candidate}</p>
        </div>}
        <div className="flex flex-wrap gap-2">
          <AdminActionButton type="submit" tone="primary" disabled={saving || loading || !!error || !candidate || !expiresAt}>즉시 게시</AdminActionButton>
          <AdminActionButton type="button" tone="ghost" disabled={saving || loading || !active} onClick={() => void save("DELETE")}>지금 내리기</AdminActionButton>
          {active && <AdminActionButton type="button" tone="ghost" disabled={saving} onClick={() => {
            setMessage(active.message);
            setExpiresAt(new Date(Date.parse(active.expiresAt) + 9 * 60 * 60 * 1000).toISOString().slice(0, 16));
          }}>게시 문구 불러오기</AdminActionButton>}
        </div>
      </form>
      {feedback && <AdminNotice tone={feedback.error ? "warning" : "success"}>{feedback.message}</AdminNotice>}
    </section>
  );
}
