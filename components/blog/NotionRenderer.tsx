// =============================================================
// Notion 블록 → React 렌더러
// heading, paragraph, list, quote, callout, image, divider 지원
// =============================================================

import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import React from "react";

// 자식 블록이 있는 블록 타입
type BlockWithChildren = BlockObjectResponse & {
  children?: BlockObjectResponse[];
};

// =============================================================
// Rich Text 렌더링 (bold, italic, strikethrough, code, link, color)
// =============================================================

function renderRichText(items: RichTextItemResponse[]): React.ReactNode[] {
  return items.map((item, i) => {
    let node: React.ReactNode = item.plain_text;

    if (item.type === "text" && item.text.link) {
      node = (
        <a
          key={i}
          href={item.text.link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] underline underline-offset-2 hover:text-[var(--color-primary-dark)]"
        >
          {node}
        </a>
      );
    }

    if (item.annotations.bold) {
      node = <strong key={`b-${i}`}>{node}</strong>;
    }
    if (item.annotations.italic) {
      node = <em key={`i-${i}`}>{node}</em>;
    }
    if (item.annotations.strikethrough) {
      node = <s key={`s-${i}`}>{node}</s>;
    }
    if (item.annotations.code) {
      node = (
        <code
          key={`c-${i}`}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-rose-600"
        >
          {node}
        </code>
      );
    }
    if (item.annotations.underline) {
      node = <u key={`u-${i}`}>{node}</u>;
    }

    // 색상 지원 (Notion 기본 색상)
    if (
      item.annotations.color &&
      item.annotations.color !== "default"
    ) {
      const colorMap: Record<string, string> = {
        gray: "text-gray-500",
        brown: "text-amber-700",
        orange: "text-orange-600",
        yellow: "text-yellow-600",
        green: "text-green-600",
        blue: "text-blue-600",
        purple: "text-purple-600",
        pink: "text-pink-600",
        red: "text-red-600",
        gray_background: "bg-gray-100",
        brown_background: "bg-amber-50",
        orange_background: "bg-orange-50",
        yellow_background: "bg-yellow-50",
        green_background: "bg-green-50",
        blue_background: "bg-blue-50",
        purple_background: "bg-purple-50",
        pink_background: "bg-pink-50",
        red_background: "bg-red-50",
      };
      const cls = colorMap[item.annotations.color];
      if (cls) {
        node = (
          <span key={`clr-${i}`} className={cls}>
            {node}
          </span>
        );
      }
    }

    return <React.Fragment key={i}>{node}</React.Fragment>;
  });
}

// =============================================================
// 개별 블록 렌더링
// =============================================================

function NotionBlock({ block }: { block: BlockWithChildren }) {
  const children = block.children?.length ? (
    <div className="ml-4">
      {block.children.map((child) => (
        <NotionBlock key={child.id} block={child as BlockWithChildren} />
      ))}
    </div>
  ) : null;

  switch (block.type) {
    case "paragraph": {
      const text = block.paragraph.rich_text;
      if (text.length === 0) return <div className="h-4" />;
      return (
        <p className="mb-4 text-base leading-relaxed text-gray-700 md:text-lg">
          {renderRichText(text)}
        </p>
      );
    }

    case "heading_1":
      return (
        <h1 className="font-headline mb-4 mt-8 text-2xl font-bold text-gray-900 md:text-3xl">
          {renderRichText(block.heading_1.rich_text)}
        </h1>
      );

    case "heading_2":
      return (
        <h2 className="font-headline mb-4 mt-8 text-xl font-bold text-gray-900 md:text-2xl">
          {renderRichText(block.heading_2.rich_text)}
        </h2>
      );

    case "heading_3":
      return (
        <h3 className="font-headline mb-3 mt-6 text-lg font-bold text-gray-900 md:text-xl">
          {renderRichText(block.heading_3.rich_text)}
        </h3>
      );

    case "bulleted_list_item":
      return (
        <li className="mb-1 ml-5 list-disc text-base leading-relaxed text-gray-700 md:text-lg">
          {renderRichText(block.bulleted_list_item.rich_text)}
          {children}
        </li>
      );

    case "numbered_list_item":
      return (
        <li className="mb-1 ml-5 list-decimal text-base leading-relaxed text-gray-700 md:text-lg">
          {renderRichText(block.numbered_list_item.rich_text)}
          {children}
        </li>
      );

    case "quote":
      return (
        <blockquote className="mb-4 border-l-4 border-[var(--color-primary)] py-2 pl-4 text-base italic text-gray-600 md:text-lg">
          {renderRichText(block.quote.rich_text)}
          {children}
        </blockquote>
      );

    case "callout": {
      const icon = block.callout.icon;
      const emoji = icon?.type === "emoji" ? icon.emoji : "💡";
      return (
        <div className="mb-4 flex gap-3 rounded-xl bg-blue-50 p-4 text-base text-gray-700 md:text-lg">
          <span className="shrink-0 text-xl">{emoji}</span>
          <div className="min-w-0 flex-1">
            {renderRichText(block.callout.rich_text)}
            {children}
          </div>
        </div>
      );
    }

    case "divider":
      return <hr className="my-8 border-gray-200" />;

    case "image": {
      const imgBlock = block.image;
      const url =
        imgBlock.type === "file"
          ? imgBlock.file.url
          : imgBlock.type === "external"
            ? imgBlock.external.url
            : null;
      const caption = imgBlock.caption?.length
        ? renderRichText(imgBlock.caption)
        : null;

      if (!url) return null;

      return (
        <figure className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={
              imgBlock.caption?.map((c) => c.plain_text).join("") ||
              "블로그 이미지"
            }
            className="w-full rounded-xl"
            loading="lazy"
          />
          {caption && (
            <figcaption className="mt-2 text-center text-sm text-gray-500">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case "toggle": {
      const summary = renderRichText(block.toggle.rich_text);
      return (
        <details className="mb-4 rounded-xl border border-gray-200 p-4">
          <summary className="cursor-pointer font-medium text-gray-900">
            {summary}
          </summary>
          <div className="mt-3">{children}</div>
        </details>
      );
    }

    case "table": {
      const rows = block.children ?? [];
      return (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, ri) => {
                if (row.type !== "table_row") return null;
                const isHeader =
                  block.table.has_column_header && ri === 0;
                const Tag = isHeader ? "th" : "td";
                return (
                  <tr
                    key={row.id}
                    className={isHeader ? "bg-gray-50" : ""}
                  >
                    {row.table_row.cells.map((cell, ci) => (
                      <Tag
                        key={ci}
                        className="border border-gray-200 px-3 py-2 text-left"
                      >
                        {renderRichText(cell)}
                      </Tag>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case "code": {
      return (
        <pre className="mb-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm text-gray-100">
          <code>
            {block.code.rich_text.map((t) => t.plain_text).join("")}
          </code>
        </pre>
      );
    }

    case "bookmark": {
      const url = block.bookmark.url;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 block rounded-xl border border-gray-200 p-4 text-sm text-[var(--color-primary)] hover:bg-gray-50"
        >
          {url}
        </a>
      );
    }

    default:
      return null;
  }
}

// =============================================================
// 리스트 그루핑 (연속된 list_item을 ul/ol로 감싸기)
// =============================================================

function groupListItems(blocks: BlockWithChildren[]): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let listBuffer: BlockWithChildren[] = [];
  let listType: "bulleted" | "numbered" | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const Tag = listType === "numbered" ? "ol" : "ul";
    result.push(
      <Tag key={`list-${result.length}`} className="mb-4">
        {listBuffer.map((b) => (
          <NotionBlock key={b.id} block={b} />
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  for (const block of blocks) {
    if (block.type === "bulleted_list_item") {
      if (listType && listType !== "bulleted") flushList();
      listType = "bulleted";
      listBuffer.push(block);
    } else if (block.type === "numbered_list_item") {
      if (listType && listType !== "numbered") flushList();
      listType = "numbered";
      listBuffer.push(block);
    } else {
      flushList();
      result.push(<NotionBlock key={block.id} block={block} />);
    }
  }
  flushList();

  return result;
}

// =============================================================
// 메인 렌더러
// =============================================================

export default function NotionRenderer({
  blocks,
}: {
  blocks: BlockObjectResponse[];
}) {
  return <>{groupListItems(blocks as BlockWithChildren[])}</>;
}
