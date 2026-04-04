"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import { getTodayKST } from "@/lib/date";

const LLM_BASE_URL = (
  process.env.NEXT_PUBLIC_LLM_BASE_URL ?? "https://llm.born2smile.co.kr"
).trim();
const LLM_MODEL = (process.env.NEXT_PUBLIC_LLM_MODEL ?? "large").trim();

const CHAT_SYSTEM_PROMPT = `당신은 서울본치과 블로그 포스트 작성을 돕는 어시스턴트입니다.
사용자가 글 주제를 말하면 짧은 질문 1~2개로 방향을 잡아주세요.
확인할 것: 검색 의도(정보형/행동형/비교형), 강조 포인트, 특수 대상(임산부·시니어 등).
질문은 한 번에 하나씩, 친근한 대화체로 진행하세요.
질문이 충분히 모였으면 "이제 초안을 생성할 준비가 됐어요!" 라고 알려주세요.
한국어로만 답하세요.`;

const GENERATE_SYSTEM_PROMPT = `당신은 서울본치과 블로그 포스트 전문 작성가입니다.
아래 지침을 따라 완성된 블로그 포스트를 JSON으로만 출력하세요. 설명 없이 JSON만 출력합니다.

## 브랜드 보이스
- 정직함: 과장·공포 유발 금지. "큰일납니다" → "초기에 치료하면 간단합니다"
- 따뜻함: 환자 불안 먼저 인정 → 안심
- 전문성: 구체적 수치·기간 사용

## 문체
- 기본 어미: ~이에요, ~해요, ~거든요 (부드러운 존댓말)
- 같은 길이 문장 3개 이상 연속 금지
- 모호한 시간 표현 금지 (구체적 수치 사용)
- 피해야 할 표현: 마케팅 과장어, 공포 마케팅, AI 반복어(다양한·중요합니다·매우 남발)

## 출력 JSON 스키마 (이 형식 그대로만 출력)
{"slug":"영소문자와-하이픈만","title":"환자 시점의 질문·증상 후킹 문구 (5~100자)","subtitle":"주제+가치 한 줄 (5~150자)","excerpt":"2~3문장 환자상황→정보 (20~300자)","category":"prevention|restorative|prosthetics|implant|orthodontics|pediatric|health-tips 중 하나","tags":["치료후관리|생활습관|팩트체크|증상가이드|비교가이드|임산부|시니어 중 1~3개"],"date":"오늘날짜 YYYY-MM-DD","published":false,"blocks":[]}

## 블록 타입
{"type":"heading","level":2,"text":"소제목"}
{"type":"paragraph","text":"문단 내용 (20자 이상)"}
{"type":"list","style":"bullet","items":["항목1","항목2"]}
{"type":"faq","question":"질문","answer":"답변 (20자 이상)"}

## 구조 (5~6섹션 권장)
1. 도입: 환자 공감 → 안심  2. 원인·배경  3. 분류·상세  4. 실천  5. 마무리`;
import type { BlogEditorData } from "../BlogEditor";

interface Message {
  role: "user" | "assistant";
  content: string;
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

    const systemPrompt =
      mode === "generate" ? GENERATE_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;

    try {
      const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: "system", content: systemPrompt }, ...msgs],
          stream: true,
          temperature: mode === "generate" ? 0.7 : 0.9,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`서버 오류 (${res.status})`);
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
          const parsed = JSON.parse(match[0]) as BlogEditorData;
          parsed.date = parsed.date || today;
          parsed.published = false;
          setDraft(parsed);
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
            onClick={onClose}
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
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{networkError}</div>
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
