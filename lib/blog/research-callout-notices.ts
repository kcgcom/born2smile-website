import type { BlogBlock } from "./types";

/** One-time repair: only strip the complete signature of the old display decorator. */
export function restoreResearchCalloutLabels(blocks: BlogBlock[]): BlogBlock[] {
  const titleSuffix = " (비공개)";
  const linkSuffix = " · 비공개";
  const descriptionSuffix = " 현재 검증 전 상태라 관리자에게만 보입니다.";
  return blocks.map((block) => {
    if (block.type !== "researchCallout") return block;
    let { title, linkText, description } = block;
    while (title.endsWith(titleSuffix) && linkText.endsWith(linkSuffix) && description.endsWith(descriptionSuffix)) {
      title = title.slice(0, -titleSuffix.length);
      linkText = linkText.slice(0, -linkSuffix.length);
      description = description.slice(0, -descriptionSuffix.length);
    }
    return { ...block, title, linkText, description };
  });
}

/** Display-only metadata. Never decorate or remove an author's saved block. */
export async function getResearchCalloutNotices(
  blocks: BlogBlock[],
  lookup: (slug: string) => Promise<{ verified: boolean } | undefined>,
): Promise<Record<string, string>> {
  const notices: Record<string, string> = {};
  const hrefs = [...new Set(blocks.filter((block) => block.type === "researchCallout").map((block) => block.href))];
  await Promise.all(hrefs.map(async (href) => {
    const match = href.match(/^\/research\/([^/?#]+)\/?$/);
    if (!match) return;
    try {
      const page = await lookup(match[1]);
      if (!page) notices[href] = "연구 자료를 찾을 수 없습니다. 연결 주소를 확인해 주세요.";
      else if (!page.verified) notices[href] = "비공개 또는 미검증 연구 자료입니다. 관리자에게만 표시됩니다.";
    } catch {
      notices[href] = "연구 자료의 공개 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.";
    }
  }));
  return notices;
}
