import type { BlogBlock, BlogCitation } from "./types";

export interface CitationResearchTarget {
  verified: boolean;
  paperIds: string[];
}

export interface CitationTargetIssue {
  path: (string | number)[];
  message: string;
}

export function parseCitationResearchHref(href: string) {
  if (typeof href !== "string") return null;
  const match = href.match(/^\/research\/([a-z0-9-]+)#paper-([a-z0-9-]+)$/);
  return match ? { slug: match[1], paperId: match[2] } : null;
}

export function getCitationResearchSlugs(blocks: BlogBlock[]): string[] {
  return [...new Set(blocks.flatMap((block) => {
    if (block.type !== "paragraph" && block.type !== "faq") return [];
    return (Array.isArray(block.citations) ? block.citations : []).flatMap((citation) => {
      if (!citation) return [];
      const target = parseCitationResearchHref(citation.researchHref);
      return target ? [target.slug] : [];
    });
  }))];
}

function targetError(citation: BlogCitation, targets: ReadonlyMap<string, CitationResearchTarget>, requirePublished: boolean): string | null {
  const ref = parseCitationResearchHref(citation.researchHref);
  if (!ref) return "연구 해설 링크 형식을 확인해 주세요.";
  const target = targets.get(ref.slug);
  if (!target) return "연결한 연구 페이지가 없습니다. 연구 해설 링크를 수정해 주세요.";
  if (!target.paperIds.includes(ref.paperId)) return "연구 페이지에 해당 논문이 없습니다. 논문 위치 링크를 다시 선택해 주세요.";
  if (requirePublished && !target.verified) return "연구 페이지가 비공개입니다. 연구 자료를 먼저 공개하거나 이 주석을 제거해 주세요.";
  return null;
}

export function getCitationTargetIssues(blocks: BlogBlock[], targets: ReadonlyMap<string, CitationResearchTarget>, requirePublished: boolean): CitationTargetIssue[] {
  return blocks.flatMap((block, blockIndex) => {
    if (block.type !== "paragraph" && block.type !== "faq") return [];
    return (block.citations ?? []).flatMap((citation, citationIndex) => {
      const error = targetError(citation, targets, requirePublished);
      return error ? [{
        path: ["blocks", blockIndex, "citations", citationIndex, "researchHref"],
        message: `블록 ${blockIndex + 1} · 주석 ${citationIndex + 1} 「${citation.title}」: ${error}`,
      }] : [];
    });
  });
}

/** Public display only. Never feed these filtered blocks to an administrator's save form. */
export function filterPublicCitationTargets(blocks: BlogBlock[], targets: ReadonlyMap<string, CitationResearchTarget>): BlogBlock[] {
  const referencedSlugs = new Set(getCitationResearchSlugs(blocks));
  return blocks.flatMap((block): BlogBlock[] => {
    if ((block.type === "paragraph" || block.type === "faq") && block.citations) {
      return [{ ...block, citations: (Array.isArray(block.citations) ? block.citations : []).filter((citation) => citation && !targetError(citation, targets, true)) }];
    }
    if (block.type === "relatedLinks") {
      const items = block.items.filter((item) => {
        const match = item.href.match(/^\/research\/([a-z0-9-]+)\/?(?:#paper-([a-z0-9-]+))?$/);
        if (!match || !referencedSlugs.has(match[1])) return true;
        const target = targets.get(match[1]);
        return target?.verified && (!match[2] || target.paperIds.includes(match[2]));
      });
      return items.length ? [{ ...block, items }] : [];
    }
    return [block];
  });
}
