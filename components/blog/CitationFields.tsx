"use client";

import type { BlogCitation } from "@/lib/blog/types";
import { getCitationQuoteError } from "@/lib/blog/citations";

const FIELDS: { key: Exclude<keyof BlogCitation, "id">; label: string; placeholder: string; max: number }[] = [
  { key: "quote", label: "근거를 연결할 본문 문장", placeholder: "이 문단에서 한 번만 나오는 문장을 그대로 입력하세요", max: 1000 },
  { key: "title", label: "근거 설명 제목", placeholder: "예: X-ray에서 보이지 않을 수도 있나요?", max: 150 },
  { key: "summary", label: "짧은 근거 설명", placeholder: "독자가 알아야 할 결과와 적용 한계를 적어 주세요", max: 600 },
  { key: "sourceLabel", label: "자료 유형·학술지·연도", placeholder: "예: 영상검사 종설 · Korean Journal of Radiology, 2025", max: 150 },
  { key: "researchHref", label: "연구 해설의 논문 위치", placeholder: "/research/주제#paper-논문ID", max: 300 },
  { key: "sourceHref", label: "원문 링크", placeholder: "https://pubmed.ncbi.nlm.nih.gov/…/", max: 500 },
];

export function CitationFields({ text, citations = [], onChange, disabled = false }: {
  text: string;
  citations?: BlogCitation[];
  onChange: (citations: BlogCitation[]) => void;
  disabled?: boolean;
}) {
  const invalid = citations.filter((citation) => getCitationQuoteError(text, citation.quote));
  return (
    <>
    {invalid.length > 0 && <p role="alert" className="mt-3 text-sm text-red-700">
      {invalid.map((citation) => `「${citation.title || "새 주석"}」`).join(", ")}의 연결 문장을 확인해 주세요. 아래 ‘근거 주석’을 펼쳐 수정할 수 있습니다.
    </p>}
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700">근거 주석 ({citations.length})</summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-600">문장 바로 뒤에 주석을 표시합니다. 본문 문장을 바꾸면 아래의 연결 문장도 함께 수정해 주세요.</p>
      {citations.map((citation, index) => {
        const quoteError = getCitationQuoteError(text, citation.quote);
        return (
          <fieldset key={citation.id} disabled={disabled} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm font-semibold">주석 {index + 1}</legend>
            {FIELDS.map(({ key, label, placeholder, max }) => (
              <label key={key} className="block text-xs font-medium text-slate-700">
                {label}
                <textarea
                  required
                  value={citation[key]}
                  maxLength={max}
                  minLength={key === "summary" ? 10 : 2}
                  rows={key === "summary" || key === "quote" ? 3 : 2}
                  placeholder={placeholder}
                  aria-invalid={key === "quote" && !!quoteError}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm focus-visible:outline-2 focus-visible:outline-teal-700"
                  onChange={(event) => onChange(citations.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item))}
                />
              </label>
            ))}
            {quoteError && <p className="text-xs text-red-700">{quoteError}</p>}
            <button type="button" onClick={() => onChange(citations.filter((_, i) => i !== index))} className="min-h-11 rounded px-3 text-sm text-red-700 focus-visible:outline-2">이 주석 삭제</button>
          </fieldset>
        );
      })}
      {citations.length < 5 && (
        <button
          type="button"
          disabled={disabled}
          className="mt-3 min-h-11 rounded-lg border border-dashed border-teal-500 px-3 text-sm text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
          onClick={() => onChange([...citations, {
            id: `note-${crypto.randomUUID()}`, quote: "", title: "", summary: "", sourceLabel: "", researchHref: "", sourceHref: "",
          }])}
        >주석 추가</button>
      )}
    </details>
    </>
  );
}
