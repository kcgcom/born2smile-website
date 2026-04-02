import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText } from "lucide-react";
import type { BlogBlock, BlogPostSection } from "@/lib/blog";

// ----------------------------------------------------------------
// 블로그 포스트 렌더 유틸리티
// 공개 페이지(/blog/[category]/[slug])와 관리자 프리뷰 페이지 공유
// ----------------------------------------------------------------

export function getHeadingList(post: {
  content?: BlogPostSection[];
  blocks?: BlogBlock[];
}): string[] {
  if (post.blocks && post.blocks.length > 0) {
    return post.blocks
      .filter(
        (block): block is Extract<BlogBlock, { type: "heading" }> =>
          block.type === "heading",
      )
      .map((block) => block.text);
  }
  return (post.content ?? []).map((s) => s.heading);
}

export function renderLegacySections(sections: BlogPostSection[]) {
  return sections.map((section, index) => (
    <div key={`${section.heading}-${index}`} id={`section-${index}`}>
      <h2 className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-3xl">
        {section.heading}
      </h2>
      <p className="text-base leading-relaxed text-gray-700 md:text-lg">
        {section.content}
      </p>
    </div>
  ));
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href);
}

export function getReferenceSource(
  href: string,
): { label: string; host: string; isOfficial: boolean } | null {
  try {
    const { hostname } = new URL(href);
    const normalized = hostname.replace(/^www\./, "");

    if (normalized.includes("nhs.uk"))
      return { label: "NHS", host: normalized, isOfficial: true };
    if (normalized.includes("fda.gov"))
      return { label: "FDA", host: normalized, isOfficial: true };
    if (
      normalized.includes("mouthhealthy.org") ||
      normalized.includes("ada.org")
    )
      return { label: "ADA", host: normalized, isOfficial: true };
    if (normalized.includes("diabetes.org"))
      return { label: "미국당뇨병학회", host: normalized, isOfficial: true };

    return { label: "외부 자료", host: normalized, isOfficial: false };
  } catch {
    return null;
  }
}

// Renders a single block without a React key (caller supplies key).
// Used by both renderBlocks (list) and InlineBlocksEditor (single-block display).
export function renderSingleBlock(
  block: BlogBlock,
  headingId?: string,
): React.ReactElement | null {
  switch (block.type) {
    case "heading": {
      const HeadingTag = block.level === 3 ? "h3" : "h2";
      return (
        <div id={headingId} className="pt-4">
          <HeadingTag className="font-headline mb-4 text-xl font-bold text-gray-900 md:text-3xl">
            {block.text}
          </HeadingTag>
        </div>
      );
    }
    case "paragraph":
      return (
        <p className="text-base leading-relaxed text-gray-700 md:text-lg">
          {block.text}
        </p>
      );
    case "list": {
      const ListTag = block.style === "number" ? "ol" : "ul";
      return (
        <ListTag
          className={`space-y-2 pl-5 text-base leading-relaxed text-gray-700 md:text-lg ${
            block.style === "number" ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ListTag>
      );
    }
    case "faq":
      return (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
          <h2 className="font-headline mb-3 text-lg font-bold text-gray-900 md:text-xl">
            {block.question}
          </h2>
          <p className="text-base leading-relaxed text-gray-700 md:text-lg">
            {block.answer}
          </p>
        </div>
      );
    case "relatedLinks": {
      const allExternal = block.items.every((item) =>
        isExternalHref(item.href),
      );
      const sectionTitle = allExternal ? "공식 참고 자료" : "함께 읽으면 좋은 글";
      const sectionClasses = allExternal
        ? "rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5"
        : "rounded-2xl border border-gray-200 bg-gray-50 p-5";

      return (
        <div className={sectionClasses}>
          <div className="mb-4 flex items-center gap-2">
            {allExternal && (
              <BookOpenText className="h-4 w-4 text-sky-700" aria-hidden="true" />
            )}
            <h2 className="font-headline text-lg font-bold text-gray-900 md:text-xl">
              {sectionTitle}
            </h2>
          </div>
          <div className="space-y-3">
            {block.items.map((item) => {
              const external = isExternalHref(item.href);
              const source = external ? getReferenceSource(item.href) : null;
              const cardClasses = external
                ? "block rounded-xl border border-sky-100 bg-white/90 p-4 transition-all hover:border-sky-200 hover:shadow-sm"
                : "block rounded-xl bg-white p-4 transition-shadow hover:shadow-sm";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={cardClasses}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {source && (
                        <div className="mb-2 flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-800">
                            {source.label}
                          </span>
                          <span className="truncate text-gray-500">
                            {source.host}
                          </span>
                        </div>
                      )}
                      <p className="font-semibold text-gray-900">{item.title}</p>
                    </div>
                    {external && (
                      <ArrowUpRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                      {item.description}
                    </p>
                  )}
                  {source?.isOfficial && (
                    <p className="mt-2 text-xs text-gray-500">
                      새 창에서 열리는 공식 환자 안내 자료입니다.
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      );
    }
    case "table":
      return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-50 text-gray-700">
              <tr>
                {block.headers.map((header, i) => (
                  <th key={i} className="px-4 py-3 font-semibold whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {block.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-3 text-gray-700 leading-relaxed ${ci === 0 ? "font-medium text-gray-900 whitespace-nowrap" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export function computeHeadingIds(blocks: BlogBlock[]): (string | undefined)[] {
  let headingIndex = -1;
  return blocks.map((block) =>
    block.type === "heading" ? `section-${++headingIndex}` : undefined,
  );
}

export function renderBlocks(blocks: BlogBlock[]) {
  const headingIds = computeHeadingIds(blocks);
  return blocks.map((block, index) => (
    <Fragment key={`block-${index}`}>
      {renderSingleBlock(block, headingIds[index])}
    </Fragment>
  ));
}
