"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { hasAdminBrowserFlag } from "@/lib/admin-visitor";
import { captureEvent } from "@/lib/posthog";
import type { FeedbackAnswer } from "@/lib/blog/feedback";

const VISITOR_KEY = "born2smile-feedback-visitor";

export default function QuestionFeedback({ slug, category, adminVisitor = false }: { slug: string; category: string; adminVisitor?: boolean }) {
  const { isAdmin, loading: adminLoading } = useAdminAuthState();
  const blockedAdmin = adminVisitor || isAdmin;
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const visitor = useRef<string | null>(null);
  const busy = useRef(false);
  const shown = useRef(false);
  const storageKey = `born2smile-feedback:${slug}`;

  useEffect(() => {
    try {
      localStorage.removeItem("born2smile_liked_slugs");
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved?.answer === "solved" || saved?.answer === "unresolved") {
        setAnswer(saved.answer);
      }
    } catch { /* Storage is optional; submission remains available. */ }
  }, [storageKey]);

  useEffect(() => {
    const node = root.current;
    if (!node || adminLoading || blockedAdmin || shown.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let visible = false;
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    const observe = () => {
      cancel();
      if (!visible || document.visibilityState !== "visible" || hasAdminBrowserFlag() || shown.current) return;
      timer = setTimeout(() => {
        shown.current = captureEvent("blog_feedback_prompt_viewed", { blog_slug: slug, category, source: "footer_feedback" }, { ga4: false });
      }, 1000);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= 0.5; observe(); }, { threshold: [0, 0.5] });
    observer.observe(node);
    document.addEventListener("visibilitychange", observe);
    return () => { cancel(); observer.disconnect(); document.removeEventListener("visibilitychange", observe); };
  }, [slug, category, adminLoading, blockedAdmin]);

  async function submit(nextAnswer: FeedbackAnswer) {
    if (busy.current || adminLoading || blockedAdmin || hasAdminBrowserFlag()) return;
    busy.current = true; setSaving(true); setMessage("");
    try {
      if (!visitor.current) {
        try { visitor.current = localStorage.getItem(VISITOR_KEY); } catch {}
        if (!visitor.current || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitor.current)) visitor.current = crypto.randomUUID();
        try { localStorage.setItem(VISITOR_KEY, visitor.current); } catch {}
      }
      const response = await fetch("/api/blog/feedback", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, visitorId: visitor.current, answer: nextAnswer }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "응답을 저장하지 못했습니다. 다시 시도해 주세요.");
      if (result.ignored) { setMessage("관리자 응답은 저장하지 않습니다."); return; }
      setAnswer(nextAnswer);
      try { localStorage.setItem(storageKey, JSON.stringify({ answer: nextAnswer })); } catch {}
      captureEvent("blog_question_feedback", {
        blog_slug: slug, category, source: "footer_feedback", answer: nextAnswer,
        feedback_id: result.data.id, feedback_updated_at: result.data.updatedAt,
      }, { ga4: false });
      setMessage("응답 감사합니다. 글을 보완하는 데 참고하겠습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "응답을 저장하지 못했습니다."); }
    finally { busy.current = false; setSaving(false); }
  }

  const disabled = saving || adminLoading || blockedAdmin;
  return <div ref={root} className="space-y-3" aria-label="질문 해결 피드백">
    <p className="text-base font-bold text-[var(--foreground)]">궁금했던 점이 해결됐나요?</p>
    <div className="flex flex-wrap gap-2">
      {([["solved", "해결됐어요"], ["unresolved", "아직 궁금해요"]] as const).map(([value, label]) =>
        <button key={value} type="button" disabled={disabled} aria-pressed={answer === value}
          onClick={() => submit(value)}
          className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-50 ${answer === value ? "border-blue-700 bg-blue-700 text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-blue-50"}`}>
          {label}
        </button>)}
    </div>
    <p role="status" aria-live="polite" className="text-sm text-[var(--muted)]">{blockedAdmin ? "관리자 응답은 저장하지 않습니다." : saving ? "응답을 저장하는 중…" : message}</p>
  </div>;
}
