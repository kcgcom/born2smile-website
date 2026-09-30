import { expect, test } from "@playwright/test";
import { duplicateBlogBlock, duplicateBlogBlockAt, insertBlogBlocks, prepareBlockConversion, replaceBlogBlock } from "../lib/blog/block-editing";
import { normalizeBlogBlocks } from "../lib/blog/normalize-blocks";
import { blogPostSchema, blogPostUpdateSchema } from "../lib/blog-validation";
import { getResearchCalloutNotices, restoreResearchCalloutLabels } from "../lib/blog/research-callout-notices";
import { getCitationTargetIssues, filterPublicCitationTargets, type CitationResearchTarget } from "../lib/blog/citation-targets";
import { getBlogCitations } from "../lib/blog/citations";
import type { BlogBlock } from "../lib/blog/types";
import { emptyBlock } from "../app/admin/(dashboard)/components/blog/block-editors/shared";
import citations from "../scripts/data/swallowed-prosthesis-citations.json";
import { getSupabaseAdmin } from "../lib/supabase-admin";
import { validateBlogCitationTargets, filterPublicBlogCitations } from "../lib/blog/citation-targets-server";
import { getResearchPageFresh, getAllResearchSlugsFresh } from "../lib/research/papers";

function paragraph(): Extract<BlogBlock, { type: "paragraph" }> {
  return { type: "paragraph", text: citations[0].quote, citations: [structuredClone(citations[0])] };
}

const publicTargets = new Map<string, CitationResearchTarget>([["swallowed-dental-prosthesis", {
  verified: true, paperIds: ["birk-2016-esge-foreign-bodies", "lee-2025-foreign-body-imaging"],
}]]);

function useOfflineDatabaseEnvironment() {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-only-not-a-real-key";
  return () => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  };
}

test("복제본의 근거를 수정해도 원본과 충돌하지 않고 저장된다", () => {
  const original = paragraph();
  const copy = duplicateBlogBlock(original) as typeof original;
  expect(copy.citations![0].id).not.toBe(original.citations![0].id);
  copy.citations![0].title = "복제본에서 수정한 근거";
  const saved = blogPostUpdateSchema.parse({ blocks: normalizeBlogBlocks([original, copy]) });
  expect(saved.blocks).toEqual([original, copy]);
  expect(original.citations![0].title).toBe(citations[0].title);
  expect(getBlogCitations(saved.blocks!)).toHaveLength(2);
});

test("60개 초과 추가·복제·API 정규화에서 내용을 자르지 않는다", () => {
  const blocks: BlogBlock[] = Array.from({ length: 60 }, (_, index) => ({ type: "paragraph", text: `문단 ${index + 1}: 초과한 내용을 삭제하지 않고 보존하는 검증입니다.` }));
  const before = structuredClone(blocks);
  expect(() => duplicateBlogBlockAt(blocks, 0)).toThrow("최대 60개");
  expect(() => insertBlogBlocks(blocks, blocks.length, [paragraph()])).toThrow("최대 60개");
  expect(blocks).toEqual(before);
  const normalized = normalizeBlogBlocks([...blocks, paragraph()]);
  expect(normalized).toHaveLength(61);
  expect(normalized[60]).toEqual(paragraph());
  expect(blogPostUpdateSchema.safeParse({ blocks: normalized }).success).toBe(false);
  expect(blogPostSchema.safeParse({ slug: "overflow-check", title: "블록 수 제한 검사", subtitle: "기존 내용을 보존하는 검사", excerpt: "본문이 제한을 넘었을 때 데이터를 삭제하지 않는지 확인합니다.", category: "prosthetics", tags: [], date: "2026-09-30", published: false, blocks: normalized }).success).toBe(false);
  const expanded = normalizeBlogBlocks([{ type: "faq", items: Array.from({ length: 61 }, () => ({ question: "검사에 관한 질문입니다", answer: "본문을 여러 개로 펼친 뒤에도 모든 내용을 보존해야 합니다." })) }]);
  expect(expanded).toHaveLength(61);
  expect(blogPostUpdateSchema.safeParse({ blocks: expanded }).success).toBe(false);
  expect(duplicateBlogBlockAt(blocks.slice(0, 59), 0)).toHaveLength(60);
});

test("관리자 표시 정보는 반복 조회해도 원문 필드를 바꾸지 않는다", async () => {
  const blocks: BlogBlock[] = [{ type: "researchCallout", title: "연구 자료 제목", description: "임상 연구를 정리한 설명입니다.", href: "/research/private", linkText: "연구 자료 보기" }];
  const before = structuredClone(blocks);
  for (let index = 0; index < 2; index++) {
    const notices = await getResearchCalloutNotices(blocks, async () => ({ verified: false }));
    expect(notices["/research/private"]).toContain("비공개");
    expect(blogPostUpdateSchema.parse({ blocks: normalizeBlogBlocks(blocks) }).blocks).toEqual(before);
  }
  expect((await getResearchCalloutNotices(blocks, async () => undefined))["/research/private"]).toContain("찾을 수 없습니다");
  expect(blocks).toEqual(before);
});

test("기존 오염 복구는 자동 안내의 세 필드가 함께 있을 때만 적용한다", () => {
  const original: BlogBlock = { type: "researchCallout", title: "원래 제목", description: "원래 연구 자료 설명입니다.", href: "/research/private", linkText: "연구 보기" };
  const polluted = { ...original, title: original.title + " (비공개) (비공개)", linkText: original.linkText + " · 비공개 · 비공개", description: original.description + " 현재 검증 전 상태라 관리자에게만 보입니다.".repeat(2) };
  expect(restoreResearchCalloutLabels([polluted])).toEqual([original]);
  expect(restoreResearchCalloutLabels([original])).toEqual([original]);
  const authored = { ...original, title: "직접 작성한 제목 (비공개)" };
  expect(restoreResearchCalloutLabels([authored])).toEqual([authored]);
});

test("문단과 FAQ 변환은 작성 중인 내용과 주석을 보존한다", () => {
  const original = paragraph();
  original.text += " 이 문장은 저장 전 작성 중인 설명입니다.";
  const converted = prepareBlockConversion(original, "faq", emptyBlock);
  expect(converted.warning).toBeNull();
  const faq = converted.blocks[0];
  expect(faq.type).toBe("faq");
  if (faq.type !== "faq") throw new Error("FAQ expected");
  expect(faq.answer).toBe(original.text);
  expect(faq.citations).toEqual(original.citations);
  faq.question = "목에 이물감이 남을 수도 있나요?";
  expect(blogPostUpdateSchema.safeParse({ blocks: converted.blocks }).success).toBe(true);
  const back = prepareBlockConversion(faq, "paragraph", emptyBlock);
  expect(back.warning).toBeNull();
  expect(back.blocks).toEqual([
    { type: "heading", level: 3, text: faq.question },
    { type: "paragraph", text: original.text, citations: original.citations },
  ]);
  expect(blogPostUpdateSchema.safeParse({ blocks: back.blocks }).success).toBe(true);
});

test("FAQ 질문의 중복 문구와 최대 길이가 답변 주석을 깨뜨리지 않는다", () => {
  const faq: BlogBlock = {
    type: "faq", question: "X-ray" + "가".repeat(145), answer: "X-ray" + "나".repeat(2995),
    citations: [{ ...citations[2], quote: "X-ray" }],
  };
  expect(blogPostUpdateSchema.safeParse({ blocks: [faq] }).success).toBe(true);
  const result = prepareBlockConversion(faq, "paragraph", emptyBlock);
  expect(blogPostUpdateSchema.safeParse({ blocks: result.blocks }).success).toBe(true);
  expect(result.blocks[0]).toEqual({ type: "heading", level: 3, text: faq.question });
  expect(result.blocks[1]).toEqual({ type: "paragraph", text: faq.answer, citations: faq.citations });
  const full = Array.from({ length: 60 }, () => paragraph());
  const before = structuredClone(full);
  expect(() => replaceBlogBlock(full, 0, result.blocks)).toThrow("60개를 넘습니다");
  expect(full).toEqual(before);
  expect(replaceBlogBlock([faq, paragraph()], 0, result.blocks)).toEqual([...result.blocks, paragraph()]);
});

test("보존할 수 없는 타입 변경은 삭제할 주석 수를 명시한다", () => {
  const original = paragraph();
  const before = structuredClone(original);
  const changed = prepareBlockConversion(original, "heading", emptyBlock);
  expect(changed.warning).toContain("주석 1개");
  expect(changed.warning).toContain("삭제");
  expect(original).toEqual(before);
  expect(prepareBlockConversion(original, "paragraph", emptyBlock).warning).toBeNull();
});

test("연결 문장 오류는 블록·주석 이름과 수정 방법을 알려준다", () => {
  const changed = paragraph();
  changed.text = "원래 문장을 지우고 새롭게 작성한 본문입니다.";
  const result = blogPostUpdateSchema.safeParse({ blocks: [changed] });
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected validation error");
  expect(result.error.issues[0].path).toEqual(["blocks", 0, "citations", 0, "quote"]);
  expect(result.error.issues[0].message).toContain(citations[0].title);
  expect(result.error.issues[0].message).toContain("다시 연결");
  changed.citations![0].quote = changed.text;
  expect(blogPostUpdateSchema.safeParse({ blocks: [changed] }).success).toBe(true);
});

test("없는 페이지·논문은 거부하고 비공개 자료는 초안에만 허용한다", () => {
  expect(getCitationTargetIssues([paragraph()], publicTargets, true)).toEqual([]);
  expect(getCitationTargetIssues([paragraph()], new Map(), false)[0].message).toContain("연구 페이지가 없습니다");
  const missingPaper = new Map([["swallowed-dental-prosthesis", { verified: true, paperIds: [] }]]);
  expect(getCitationTargetIssues([paragraph()], missingPaper, true)[0].message).toContain("해당 논문이 없습니다");
  const privateTargets = new Map([["swallowed-dental-prosthesis", { ...publicTargets.get("swallowed-dental-prosthesis")!, verified: false }]]);
  expect(getCitationTargetIssues([paragraph()], privateTargets, false)).toEqual([]);
  expect(getCitationTargetIssues([paragraph()], privateTargets, true)[0].message).toContain("비공개");
});

test("공개 화면에서 잘못된 근거를 숨겨도 원본과 기존 본문은 손상되지 않는다", () => {
  const original: BlogBlock[] = [paragraph(), { type: "relatedLinks", items: [
    { title: "연구 자료", href: "/research/swallowed-dental-prosthesis" },
    { title: "다른 글", href: "/blog/prosthetics/crown-fell-off-what-to-do" },
  ] }];
  const before = structuredClone(original);
  const rendered = filterPublicCitationTargets(original, new Map());
  expect(original).toEqual(before);
  expect(rendered[0]).toEqual({ ...original[0], citations: [] });
  expect(rendered[1]).toEqual({ type: "relatedLinks", items: [{ title: "다른 글", href: "/blog/prosthetics/crown-fell-off-what-to-do" }] });
  expect(filterPublicCitationTargets(original, publicTargets)).toEqual(original);
});

test("조회 장애 시 저장은 중단하고 본문을 남긴 채 주석을 숨긴다", async () => {
  const restoreEnvironment = useOfflineDatabaseEnvironment();
  const db = getSupabaseAdmin();
  const originalFrom = db.from;
  try {
    db.from = (() => ({ select: () => ({ in: async () => ({ data: null, error: { message: "offline" } }) }) })) as unknown as typeof db.from;
    await expect(validateBlogCitationTargets([paragraph()], true)).rejects.toThrow("상태를 확인하지 못했습니다");
    expect(await filterPublicBlogCitations([paragraph()])).toEqual([{ ...paragraph(), citations: [] }]);
    db.from = (() => ({ select: () => ({ in: async () => ({
      data: [{ slug: "swallowed-dental-prosthesis", verified: false, data: null }], error: null,
    }) }) })) as unknown as typeof db.from;
    expect(await filterPublicBlogCitations([paragraph()])).toEqual([{ ...paragraph(), citations: [] }]);
  } finally { db.from = originalFrom; restoreEnvironment(); }
});

test("비공개 또는 삭제가 확인되면 연구 페이지를 과거 스냅샷으로 되살리지 않는다", async () => {
  const restoreEnvironment = useOfflineDatabaseEnvironment();
  const db = getSupabaseAdmin();
  const originalFrom = db.from;
  try {
    for (const data of [null, { verified: false, data: { slug: "swallowed-dental-prosthesis" } }]) {
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data, error: null }), order: async () => ({ data: [], error: null }) };
      db.from = (() => query) as unknown as typeof db.from;
      expect(await getResearchPageFresh("swallowed-dental-prosthesis")).toBeUndefined();
      expect(await getAllResearchSlugsFresh()).toEqual([]);
    }
    const offline = {
      select: () => offline, eq: () => offline,
      in: async () => ({ data: null, error: { message: "offline" } }),
      maybeSingle: async () => ({ data: null, error: { message: "offline" } }),
      order: async () => ({ data: null, error: { message: "offline" } }),
    };
    db.from = (() => offline) as unknown as typeof db.from;
    await expect(getResearchPageFresh("swallowed-dental-prosthesis")).rejects.toThrow("공개 상태를 확인하지 못했습니다");
    await expect(getAllResearchSlugsFresh()).rejects.toThrow("목록을 확인하지 못했습니다");
    expect(await filterPublicBlogCitations([paragraph()])).toEqual([{ ...paragraph(), citations: [] }]);
  } finally { db.from = originalFrom; restoreEnvironment(); }
});
