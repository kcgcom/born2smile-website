import type { BlogBlock } from "./types";
import { MAX_BLOG_BLOCKS } from "./normalize-blocks";

export function insertBlogBlocks(blocks: BlogBlock[], index: number, additions: BlogBlock[]): BlogBlock[] {
  if (index < 0 || index > blocks.length) throw new Error("블록을 추가할 위치를 찾을 수 없습니다.");
  if (blocks.length + additions.length > MAX_BLOG_BLOCKS) {
    throw new Error(`본문 블록은 최대 ${MAX_BLOG_BLOCKS}개입니다. 기존 내용을 유지한 채 추가·복제를 중단했습니다.`);
  }
  return [...blocks.slice(0, index), ...additions, ...blocks.slice(index)];
}

export function duplicateBlogBlockAt(blocks: BlogBlock[], index: number): BlogBlock[] {
  if (!blocks[index]) throw new Error("복제할 블록을 찾을 수 없습니다.");
  return insertBlogBlocks(blocks, index + 1, [duplicateBlogBlock(blocks[index])]);
}

export function replaceBlogBlock(blocks: BlogBlock[], index: number, replacements: BlogBlock[]): BlogBlock[] {
  if (index < 0 || index >= blocks.length) throw new Error("변환할 블록을 찾을 수 없습니다.");
  if (blocks.length - 1 + replacements.length > MAX_BLOG_BLOCKS) {
    throw new Error(`변환하면 블록 수가 ${MAX_BLOG_BLOCKS}개를 넘습니다. 다른 블록을 정리한 뒤 다시 시도해 주세요.`);
  }
  return [...blocks.slice(0, index), ...replacements, ...blocks.slice(index + 1)];
}

export function duplicateBlogBlock(block: BlogBlock): BlogBlock {
  const copy = structuredClone(block);
  if (copy.type === "paragraph" || copy.type === "faq") {
    copy.citations = copy.citations?.map((citation) => ({
      ...citation,
      id: `note-${crypto.randomUUID()}`,
    }));
  }
  return copy;
}

export function prepareBlockConversion(
  current: BlogBlock,
  type: BlogBlock["type"],
  makeDefault: (type: BlogBlock["type"]) => BlogBlock,
): { blocks: BlogBlock[]; warning: string | null } {
  if (current.type === type) return { blocks: [current], warning: null };
  if (current.type === "paragraph" && type === "faq") {
    return { blocks: [{ type: "faq", question: "", answer: current.text, citations: current.citations }], warning: null };
  }
  if (current.type === "faq" && type === "paragraph") {
    return {
      blocks: [
        ...(current.question.trim() ? [{ type: "heading" as const, level: 3 as const, text: current.question }] : []),
        { type: "paragraph", text: current.answer, citations: current.citations },
      ],
      warning: null,
    };
  }
  const count = current.type === "paragraph" || current.type === "faq" ? current.citations?.length ?? 0 : 0;
  return {
    blocks: [makeDefault(type)],
    warning: `블록 형식을 바꾸면 현재 내용${count ? `과 주석 ${count}개` : ""}이 삭제됩니다. 계속할까요?`,
  };
}
