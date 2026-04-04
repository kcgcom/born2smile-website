import { NextRequest } from "next/server";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";
import { adminAiWriteRequestSchema } from "@/lib/blog-validation";

const LLM_BASE_URL = (process.env.LLM_BASE_URL ?? "https://llm.born2smile.co.kr").trim();
const LLM_MODEL = (process.env.LLM_MODEL ?? "large").trim();
const HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
} as const;

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
- 따뜻함: 환자 불안 먼저 인정 → 안심. "걱정되시죠? 정상적인 반응입니다"
- 전문성: 구체적 수치·기간 사용. "일시적으로" → "보통 2~3일"

## 문체 원칙
- 기본 어미: ~이에요, ~해요, ~거든요 (부드러운 존댓말)
- 같은 길이 문장 3개 이상 연속 금지 — 리듬 유지
- 모호한 시간·정도 표현 금지 — 구체적 수치 사용
- 피해야 할 표현: 마케팅 과장어, 공포 마케팅, AI 반복어(다양한·중요합니다·매우 남발)

## 출력 JSON 스키마 (이 형식 그대로만 출력)
{
  "slug": "영소문자와-하이픈만-최대-50자",
  "title": "환자 시점의 질문·증상을 후킹 문구로 (5~100자)",
  "subtitle": "주제 + 가치/범위 한 줄 (5~150자)",
  "excerpt": "2~3문장. 환자 상황→이 글이 제공하는 정보 (20~300자)",
  "category": "prevention | restorative | prosthetics | implant | orthodontics | pediatric | health-tips 중 하나",
  "tags": ["치료후관리 | 생활습관 | 팩트체크 | 증상가이드 | 비교가이드 | 임산부 | 시니어 중 1~3개"],
  "date": "오늘 날짜 YYYY-MM-DD",
  "published": false,
  "blocks": []
}

## 블록 타입 (blocks 배열에 사용)
{ "type": "heading", "level": 2, "text": "소제목 (H2)" }
{ "type": "heading", "level": 3, "text": "소소제목 (H3)" }
{ "type": "paragraph", "text": "문단 내용 (20자 이상)" }
{ "type": "list", "style": "bullet", "items": ["항목1", "항목2"] }
{ "type": "list", "style": "number", "items": ["단계1", "단계2"] }
{ "type": "faq", "question": "질문 (5자 이상)", "answer": "답변 (20자 이상)" }
{ "type": "relatedLinks", "items": [{ "title": "제목", "href": "/blog/category/slug", "description": "설명" }] }

## 구조 권장 (5~6섹션)
1. 도입: 환자 공감 → 안심/정의
2. 원인·배경: 쉬운 비유로 메커니즘 설명
3. 분류·상세: 전문 정보를 환자 눈높이로
4. 실천: 구체적 행동 안내
5. 마무리: 요약 → 내원 조건 → 서울본치과 멘트 (본문 내용과 직접 연결될 때만)`;

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: HEADERS },
    );
  }

  const parsed = adminAiWriteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "VALIDATION_ERROR",
        message: "AI 작성 요청 형식이 올바르지 않습니다",
        issues: parsed.error.issues,
      },
      { status: 400, headers: HEADERS },
    );
  }

  const { messages, mode } = parsed.data;

  const systemPrompt = mode === "generate" ? GENERATE_SYSTEM_PROMPT : CHAT_SYSTEM_PROMPT;

  let upstream: Response;
  try {
    upstream = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature: mode === "generate" ? 0.7 : 0.9,
      }),
    });
  } catch {
    return Response.json(
      { error: "UPSTREAM_UNAVAILABLE", message: "LLM 서버에 연결할 수 없습니다" },
      { status: 502, headers: HEADERS },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: "UPSTREAM_ERROR", message: `LLM 서버 오류 (${upstream.status})` },
      { status: 502, headers: HEADERS },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      ...HEADERS,
      "X-Accel-Buffering": "no",
    },
  });
}
