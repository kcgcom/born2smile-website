import type { BlogBlock, BlogCitation } from "./types";

export function isResearchCitationHref(href: string): boolean {
  return /^\/research\/[a-z0-9-]+#paper-[a-z0-9-]+$/.test(href);
}

export function isCitationSourceHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Used at render time too: legacy or externally edited data must not create unsafe links. */
export function getTextCitations(text: string, citations: BlogCitation[] = []): BlogCitation[] {
  const result: BlogCitation[] = [];
  let end = 0;
  const candidates = (Array.isArray(citations) ? citations : []).filter((citation) => (
    citation && typeof citation.id === "string"
    && /^[a-z0-9][a-z0-9-]{0,79}$/.test(citation.id)
    && typeof citation.quote === "string" && citation.quote.length > 0
    && typeof citation.title === "string" && typeof citation.summary === "string"
    && typeof citation.sourceLabel === "string"
    && text.indexOf(citation.quote) >= 0
    && text.indexOf(citation.quote) === text.lastIndexOf(citation.quote)
    && isResearchCitationHref(citation.researchHref)
    && isCitationSourceHref(citation.sourceHref)
  )).sort((a, b) => text.indexOf(a.quote) - text.indexOf(b.quote));

  for (const citation of candidates) {
    const start = text.indexOf(citation.quote);
    if (start < end) continue;
    result.push(citation);
    end = start + citation.quote.length;
  }
  return result;
}

export function getBlogCitations(blocks: BlogBlock[]): BlogCitation[] {
  const citations = new Map<string, BlogCitation>();
  for (const block of blocks) {
    if (block.type !== "paragraph" && block.type !== "faq") continue;
    const text = block.type === "paragraph" ? block.text : block.answer;
    for (const citation of getTextCitations(text, block.citations)) {
      if (!citations.has(citation.id)) citations.set(citation.id, citation);
    }
  }
  return [...citations.values()];
}
