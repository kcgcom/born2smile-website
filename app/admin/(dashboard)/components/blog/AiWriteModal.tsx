"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { getTodayKST } from "@/lib/date";
import type { BlogEditorData } from "../BlogEditor";
import { getAccessToken } from "@/lib/supabase";
import { blogPostSchema } from "@/lib/blog-validation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

interface AiWriteModalProps {
  onClose: () => void;
  onDraftReady: (data: BlogEditorData) => void;
}

export function AiWriteModal({ onClose, onDraftReady }: AiWriteModalProps) {
  const today = getTodayKST();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "어떤 주제로 블로그 포스트를 작성할까요? 주제나 키워드를 알려주시면 방향을 함께 잡아드릴게요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [draft, setDraft] = useState<BlogEditorData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamBuffer, draft]);

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  async function callLLM(msgs: Message[], mode: "chat" | "generate") {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStreaming(true);
    setStreamBuffer("");
    setIsThinking(false);
    setNetworkError(null);
    setParseError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/ai-write", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: msgs,
          mode,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errorBody = (await res.json().catch(() => ({}))) as ApiErrorResponse;
        const retryAfter = res.headers.get("Retry-After");
        if (res.status === 429) {
          const retryHint = retryAfter ? ` 약 ${retryAfter}초 후 다시 시도해 주세요.` : " 잠시 후 다시 시도해 주세요.";
          throw new Error(errorBody.message ? `${errorBody.message}.${retryHint}` : `요청이 너무 빠릅니다.${retryHint}`);
        }
        throw new Error(errorBody.message ?? `서버 오류 (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta ?? {};
            const content: string = delta.content ?? "";
            const reasoning: string = delta.reasoning_content ?? "";

            if (content) {
              full += content;
              setStreamBuffer(full);
              setIsThinking(false);
            } else if (reasoning && !full) {
              setIsThinking(true);
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }

      setStreamBuffer("");
      setIsThinking(false);

      if (mode === "generate") {
        // strip markdown code fence if present
        const jsonStr = full.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (!match) {
          setParseError("JSON 파싱 실패 — 다시 생성해 주세요");
          return;
        }
        try {
          const candidate = JSON.parse(match[0]) as Partial<BlogEditorData>;
          const normalized = {
            slug: typeof candidate.slug === "string" ? candidate.slug.trim() : "",
            title: typeof candidate.title === "string" ? candidate.title.trim() : "",
            subtitle: typeof candidate.subtitle === "string" ? candidate.subtitle.trim() : "",
            excerpt: typeof candidate.excerpt === "string" ? candidate.excerpt.trim() : "",
            category: candidate.category,
            tags: Array.isArray(candidate.tags) ? candidate.tags : [],
            date: typeof candidate.date === "string" && candidate.date.trim() ? candidate.date : today,
            published: false,
            blocks: Array.isArray(candidate.blocks) ? candidate.blocks : [],
          };
          const validated = blogPostSchema.safeParse(normalized);
          if (!validated.success) {
            const issue = validated.error.issues[0];
            setParseError(issue?.message ?? "초안 형식이 올바르지 않습니다 — 다시 생성해 주세요");
            return;
          }
          setDraft(validated.data);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "초안이 완성됐어요! 아래에서 확인하고 편집기로 열어보세요." },
          ]);
        } catch {
          setParseError("JSON 파싱 실패 — 다시 생성해 주세요");
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setNetworkError((e as Error).message || "오류가 발생했습니다");
      }
    } finally {
      setStreaming(false);
    }
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    await callLLM(next, "chat");
  };

  const handleGenerate = async () => {
    if (streaming) return;
    await callLLM(messages, "generate");
  };

  const handleRetry = () => {
    setDraft(null);
    setParseError(null);
    handleGenerate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[640px] w-full max-w-2xl flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-gold)]" />
            <h2 className="font-semibold text-[var(--foreground)]">AI 블로그 작성 도우미</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--foreground)]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming / thinking bubble */}
          {(streaming || isThinking) && (
            <div className="flex justify-start">
              <div className="max-w-[82%] rounded-2xl bg-[var(--surface-2)] px-4 py-2.5 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
                {streamBuffer || (
                  <span className="flex items-center gap-1 text-[var(--muted)]">
                    {isThinking && <span className="text-xs">생각 중</span>}
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:100ms]">·</span>
                    <span className="animate-bounce [animation-delay:200ms]">·</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Draft preview */}
          {draft && (
            <div className="rounded-xl border border-[var(--color-gold)] bg-[var(--color-gold-bg,#FDF3E0)] p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-gold-text,#7A5A12)]">
                초안 완성
              </p>
              <p className="font-semibold text-[var(--foreground)] leading-snug">{draft.title}</p>
              <p className="text-sm text-[var(--muted)]">{draft.subtitle}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="rounded bg-[var(--surface-2)] px-2 py-0.5">{draft.category}</span>
                {draft.tags.map((tag) => (
                  <span key={tag} className="rounded bg-[var(--surface-2)] px-2 py-0.5">
                    {tag}
                  </span>
                ))}
                <span className="text-[var(--muted)]">블록 {draft.blocks?.length ?? 0}개</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onDraftReady(draft)}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  편집기로 열기
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  재생성
                </button>
              </div>
            </div>
          )}

          {parseError && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              <span>{parseError}</span>
              <button onClick={handleRetry} className="ml-3 underline underline-offset-2">
                다시 시도
              </button>
            </div>
          )}

          {networkError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              <p>{networkError}</p>
              {networkError.includes("다시 시도") && (
                <p className="mt-1 text-xs text-red-500">잠시 기다린 뒤 같은 요청을 다시 보내 주세요.</p>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        {!draft && (
          <div className="border-t border-[var(--border)] p-4 space-y-2.5">
            {userMessageCount >= 1 && (
              <button
                onClick={handleGenerate}
                disabled={streaming}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-gold,#C9930A)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                초안 생성하기
              </button>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={streaming}
                placeholder="주제나 키워드를 입력하세요… (Enter 전송 / Shift+Enter 줄바꿈)"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="rounded-lg bg-[var(--color-primary)] p-2.5 text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
