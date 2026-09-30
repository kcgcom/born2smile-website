"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getTextCitations } from "@/lib/blog/citations";
import type { BlogCitation } from "@/lib/blog/types";

const LINK_CLASS = "rounded text-teal-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700";

function getPopoverPosition(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  const width = Math.min(384, window.innerWidth - 32);
  const height = Math.min(360, window.innerHeight - 32);
  const below = window.innerHeight - rect.bottom - 16;
  const preferredTop = below >= height ? rect.bottom + 8 : rect.top - height - 8;
  return {
    left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
    top: Math.max(16, Math.min(preferredTop, window.innerHeight - height - 16)),
    width,
    height,
  };
}

function CitationPopover({ citation, number }: { citation: BlogCitation; number: number }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const isOpen = position !== null;

  useEffect(() => {
    if (!isOpen) return;
    dialog.current?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!dialog.current?.contains(event.target) && !trigger.current?.contains(event.target)) {
        setPosition(null);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPosition(null);
      trigger.current?.focus({ preventScroll: true });
    };
    const onViewportChange = (event: Event) => {
      if (event.target instanceof Node && dialog.current?.contains(event.target)) return;
      // Focus and smooth scrolling can dispatch scroll after opening. Reposition,
      // rather than dismissing the dialog while a reader is trying to use it.
      if (trigger.current) setPosition(getPopoverPosition(trigger.current));
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen]);

  return (
    <>
      <sup className="relative align-baseline">
        <button
          ref={trigger}
          type="button"
          aria-label={`근거 ${number}: ${citation.title}`}
          aria-haspopup="dialog"
          aria-expanded={!!position}
          aria-controls={position ? id : undefined}
          className="mx-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg align-middle text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          onClick={(event) => {
            event.stopPropagation();
            if (position) { setPosition(null); return; }
            setPosition(getPopoverPosition(event.currentTarget));
          }}
        >
          [{number}]
        </button>
      </sup>
      {position && createPortal(
        <div
          ref={dialog}
          id={id}
          role="dialog"
          aria-label={`근거 ${number}: ${citation.title}`}
          tabIndex={-1}
          className="fixed z-[100] overflow-y-auto overscroll-contain rounded-2xl border border-teal-200 bg-white p-5 text-[var(--foreground)] shadow-xl focus-visible:outline-2 focus-visible:outline-teal-700"
          style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.height }}
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)
              && event.relatedTarget !== trigger.current) setPosition(null);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="pt-2 font-semibold">{citation.title}</p>
            <button
              type="button"
              aria-label="근거 설명 닫기"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700"
              onClick={() => { setPosition(null); trigger.current?.focus({ preventScroll: true }); }}
            ><X size={18} aria-hidden="true" /></button>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{citation.summary}</p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">{citation.sourceLabel}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <a href={citation.researchHref} className={`${LINK_CLASS} inline-flex min-h-11 items-center`}>연구 해설 보기</a>
            <a href={citation.sourceHref} target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} inline-flex min-h-11 items-center`}>원문 보기 (새 창)</a>
          </div>
        </div>, document.body,
      )}
    </>
  );
}

export function CitationText({ text, citations, references }: {
  text: string;
  citations?: BlogCitation[];
  references: BlogCitation[];
}) {
  const matched = getTextCitations(text, citations);
  const last = matched[matched.length - 1];
  const tail = last ? text.indexOf(last.quote) + last.quote.length : 0;
  return <>{matched.map((citation, index) => {
    const previous = matched[index - 1];
    const start = previous ? text.indexOf(previous.quote) + previous.quote.length : 0;
    const end = text.indexOf(citation.quote) + citation.quote.length;
    const part = text.slice(start, end);
    const number = references.findIndex((reference) => reference.id === citation.id) + 1;
    return <Fragment key={citation.id}>{part}{number > 0 && <CitationPopover citation={citation} number={number} />}</Fragment>;
  })}{text.slice(tail)}</>;
}

export function CitationReferences({ references }: { references: BlogCitation[] }) {
  if (!references.length) return null;
  return (
    <section aria-label="참고 근거" className="border-t border-[var(--border)] pt-6">
      <h2 className="text-lg font-semibold">참고 근거</h2>
      <ol className="mt-4 space-y-4 text-sm">
        {references.map((citation, index) => (
          <li key={citation.id} id={`reference-${citation.id}`} className="scroll-mt-28">
            <p className="font-medium">[{index + 1}] {citation.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{citation.sourceLabel}</p>
            <div className="flex flex-wrap gap-x-5">
              <a href={citation.researchHref} className={`${LINK_CLASS} inline-flex min-h-11 items-center`}>{citation.title} — 연구 해설</a>
              <a href={citation.sourceHref} target="_blank" rel="noopener noreferrer" className={`${LINK_CLASS} inline-flex min-h-11 items-center`}>원문 보기 (새 창)</a>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
