"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AdminActionButton } from "@/components/admin/AdminChrome";
import { INSURANCE_FORMS_API, type InsuranceForm } from "@/lib/insurance-forms";
import {
  getInsurancePrintPositions, INSURANCE_PRINT_DEFAULTS, INSURANCE_PRINT_FIELD_LABELS, splitInsurancePrintPhone,
  type InsurancePrintField, type InsurancePrintPosition, type InsurancePrintValues,
} from "@/lib/insurance-form-print-fields";
import { fetchAdminResponse } from "./useAdminApi";

const PDF_ASSET_PATH = "/api/pdf-preview-assets";
const PRINT_SCALE = 180 / 72;
const MAX_CANVAS_PIXELS = 8_000_000;
const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;

interface PdfPageImage {
  src: string;
  width: number;
  height: number;
}

interface ClinicTextProps {
  page: PdfPageImage;
  positions: readonly InsurancePrintPosition[];
  values: InsurancePrintValues;
}

function InsuranceFormClinicText({ page, positions, values }: ClinicTextProps) {
  if (!positions.length) return null;
  const phoneParts = splitInsurancePrintPhone(values.phone);
  const fontSize = 9;
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full"
      viewBox={`0 0 ${page.width} ${page.height}`} preserveAspectRatio="none"
      fontFamily="Arial, 'Malgun Gothic', sans-serif" fontSize={fontSize} fill="#111">
      {positions.map(([field, x, baseline, width, phonePart, anchor]) => {
        const value = phonePart ? phoneParts?.[phonePart] : values[field].trim();
        if (!value) return null;
        const naturalWidth = Array.from(value).reduce((total, char) => total + (/[^\x00-\x7f]/.test(char) ? 1 : 0.62), 0) * fontSize;
        return <text key={`${field}-${x}-${baseline}`} x={x} y={baseline} textAnchor={anchor}
          textLength={naturalWidth > width ? width : undefined} lengthAdjust="spacingAndGlyphs">{value}</text>;
      })}
    </svg>
  );
}

function InsuranceFormPrintPages({ pages, positions, values }: {
  pages: PdfPageImage[];
  positions: readonly InsurancePrintPosition[];
  values: InsurancePrintValues;
}) {
  const sizes = pages.map(({ width, height }, index) =>
    `@page insurance-form-${index} { size: ${width}pt ${height}pt; margin: 0; }`,
  ).join("\n");
  return createPortal(
    <div id="insurance-form-print" aria-hidden="true" className="hidden print:block">
      <style media="print">{`
        html, body { margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
        html { overflow: visible !important; scrollbar-gutter: auto !important; }
        body > :not(#insurance-form-print) { display: none !important; }
        #insurance-form-print > div { break-after: page; break-inside: avoid; }
        #insurance-form-print > div:last-child { break-after: auto; }
        #insurance-form-print img { display: block; height: 100%; width: 100%; }
        ${sizes}
      `}</style>
      {pages.map((page, index) => (
        <div key={page.src} className="relative"
          style={{ page: `insurance-form-${index}`, width: `${page.width}pt`, height: `${page.height}pt` }}>
          <Image unoptimized loading="eager" src={page.src} width={Math.ceil(page.width)} height={Math.ceil(page.height)} alt="" />
          {index === 0 && <InsuranceFormClinicText page={page} positions={positions} values={values} />}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function InsuranceFormPdfPreview({ form }: { form?: InsuranceForm }) {
  const [pdfPreview, setPdfPreview] = useState<{ pages: PdfPageImage[]; positions: readonly InsurancePrintPosition[] }>({
    pages: [], positions: [],
  });
  const [values, setValues] = useState<InsurancePrintValues>(INSURANCE_PRINT_DEFAULTS);
  const [includeClinicInfo, setIncludeClinicInfo] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const formId = form?.id;

  useEffect(() => {
    if (!formId) return;
    function resetPrintOptions() {
      setValues(INSURANCE_PRINT_DEFAULTS);
      setIncludeClinicInfo(true);
    }
    window.addEventListener("afterprint", resetPrintOptions);
    return () => window.removeEventListener("afterprint", resetPrintOptions);
  }, [formId]);

  useEffect(() => {
    if (!formId) return;
    const controller = new AbortController();
    const { signal } = controller;
    const objectUrls: string[] = [];

    async function load() {
      const response = await fetchAdminResponse(`${INSURANCE_FORMS_API}/${formId}`);
      const { data: { url } } = await response.json() as { data: { url: string } };
      const [fileResponse, pdfjs] = await Promise.all([
        fetch(url, { signal, cache: "no-store" }),
        import("pdfjs-dist/legacy/build/pdf.mjs"),
      ]);
      if (!fileResponse.ok) throw new Error("PDF 파일을 불러올 수 없습니다.");
      const data = await fileResponse.arrayBuffer();
      const positions = await getInsurancePrintPositions(data);
      signal.throwIfAborted();

      pdfjs.GlobalWorkerOptions.workerSrc = `${PDF_ASSET_PATH}/worker/pdf.worker.min.mjs`;
      const task = pdfjs.getDocument({
        data, cMapUrl: `${PDF_ASSET_PATH}/cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${PDF_ASSET_PATH}/standard_fonts/`, useWasm: false,
      });

      const destroy = () => task.destroy().catch(() => {});
      signal.addEventListener("abort", destroy, { once: true });
      try {
        const pdf = await task.promise;
        const images: PdfPageImage[] = [];
        for (let number = 1; number <= pdf.numPages; number += 1) {
          signal.throwIfAborted();
          const page = await pdf.getPage(number);
          const { width, height } = page.getViewport({ scale: 1 });
          const scale = Math.min(PRINT_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const render = page.render({ canvas, viewport, intent: "print" });
          const cancel = () => render.cancel();
          signal.addEventListener("abort", cancel, { once: true });
          try {
            await render.promise;
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
            signal.throwIfAborted();
            if (!blob) throw new Error("PDF 페이지를 준비하지 못했습니다.");
            const src = URL.createObjectURL(blob);
            objectUrls.push(src);
            const image = new window.Image();
            image.src = src;
            await image.decode();
            images.push({ src, width, height });
          } finally {
            signal.removeEventListener("abort", cancel);
            canvas.width = canvas.height = 0;
            page.cleanup();
          }
        }
        if (!signal.aborted) setPdfPreview({ pages: images, positions });
      } finally {
        signal.removeEventListener("abort", destroy);
        if (!signal.aborted) await destroy();
      }
    }

    void load().catch(() => {
      if (!signal.aborted) setError("양식 미리보기를 불러오지 못했습니다.");
    });
    return () => {
      controller.abort();
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [formId, attempt]);

  const { pages, positions } = pdfPreview;
  const currentPage = pages[pageIndex];
  const activePositions = includeClinicInfo ? positions : [];
  const availableFields = new Set(positions.map(([field]) => field));
  const editableFields = (Object.keys(INSURANCE_PRINT_FIELD_LABELS) as InsurancePrintField[])
    .filter(field => availableFields.has(field));
  const invalidPhone = includeClinicInfo && availableFields.has("phone") && !!values.phone.trim()
    && !splitInsurancePrintPhone(values.phone);
  const zoomed = zoomIndex > 0;
  const zoomScale = ZOOM_LEVELS[zoomIndex];
  return <>
    <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <div className="flex min-h-11 min-w-0 flex-[1_1_10rem] flex-col justify-center">
        {form && <p className="truncate text-sm text-slate-600">{form.insurer}</p>}
        <h2 className="truncate font-semibold">{form?.title ?? "양식 미리보기"}</h2>
      </div>
      <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
        <div role="group" aria-label="미리보기 배율"
          className="flex shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-slate-200">
          <AdminActionButton tone="dark" aria-label="미리보기 축소" title="축소"
            className="size-11 rounded-none! border-0! bg-transparent p-0! focus-visible:-outline-offset-2"
            disabled={!zoomed} onClick={() => setZoomIndex(zoomIndex - 1)}>
            <Minus size={18} aria-hidden="true" />
          </AdminActionButton>
          <span aria-hidden="true" className="border-l border-slate-200" />
          <AdminActionButton tone="dark" aria-label="미리보기 확대" title="확대"
            className="size-11 rounded-none! border-0! bg-transparent p-0! focus-visible:-outline-offset-2"
            disabled={!currentPage || zoomIndex === ZOOM_LEVELS.length - 1} onClick={() => setZoomIndex(zoomIndex + 1)}>
            <Plus size={18} aria-hidden="true" />
          </AdminActionButton>
        </div>
        <AdminActionButton tone="primary" disabled={!currentPage || invalidPhone} onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> PDF 인쇄
        </AdminActionButton>
      </div>
    </header>
    <div className="flex aspect-[595/842] max-h-[64dvh] w-full bg-slate-100 px-3 py-2 sm:px-4 lg:max-h-[calc(64dvh+3rem)]">
      <div id="insurance-form-preview-page" key={`${pageIndex}-${zoomed}`} role={zoomed ? "region" : undefined}
        aria-label={zoomed ? "확대된 양식 미리보기" : undefined} tabIndex={zoomed ? 0 : undefined}
        className={`min-w-0 flex-1 [container-type:size] ${
          zoomed ? "overflow-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700"
            : "flex items-center justify-center"
        }`}>
        {!form ? <p className="text-center text-sm text-slate-600">보험사 양식을 선택하면 미리볼 수 있습니다.</p>
          : error ? <div className="space-y-3 text-center">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <AdminActionButton tone="dark" onClick={() => { setError(""); setAttempt(attempt + 1); }}>다시 불러오기</AdminActionButton>
          </div> : currentPage ? (
            <div key={currentPage.src} className="relative shrink-0 bg-white shadow-sm"
              style={{ width: `calc(min(100cqw, ${100 * currentPage.width / currentPage.height}cqh) * ${zoomScale})` }}>
              <Image unoptimized loading="eager" src={currentPage.src}
                width={Math.ceil(currentPage.width)} height={Math.ceil(currentPage.height)}
                alt={`${form.title} ${pageIndex + 1}쪽 미리보기`} className="block h-auto w-full" />
              {pageIndex === 0 && <InsuranceFormClinicText page={currentPage} positions={activePositions} values={values} />}
            </div>
          ) : <p role="status" className="text-center text-sm text-slate-600">양식 미리보기를 준비하고 있습니다…</p>}
      </div>
    </div>
    {currentPage && <>
      {positions.length > 0 ? (
        <div className="flex flex-wrap items-start gap-x-4 border-t border-slate-200 px-4 py-1 text-sm">
          <label className="flex min-h-11 items-center gap-2 font-medium text-slate-700">
            <input type="checkbox" checked={includeClinicInfo} onChange={event => setIncludeClinicInfo(event.target.checked)} />
            병원 정보 인쇄
          </label>
          <details className="min-w-0 flex-1">
            <summary className="min-h-11 cursor-pointer py-3 font-medium text-slate-700">이번 출력 정보 수정</summary>
            <div className="grid gap-2 pb-3 sm:grid-cols-2">
              {editableFields.map(field => (
                <label key={field} className="grid min-w-0 gap-1 font-medium text-slate-700">
                  {INSURANCE_PRINT_FIELD_LABELS[field]}
                  <input type={field === "phone" ? "tel" : "text"} value={values[field]} maxLength={80}
                    aria-invalid={field === "phone" && invalidPhone ? true : undefined}
                    onChange={event => setValues(current => ({ ...current, [field]: event.target.value }))}
                    className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 focus-visible:outline-2 focus-visible:outline-blue-700" />
                </label>
              ))}
            </div>
          </details>
          {invalidPhone && <p role="alert" className="basis-full pb-2 text-red-700">전화번호를 070-4633-6940과 같은 형식으로 입력해 주세요.</p>}
        </div>
      ) : <p className="border-t border-slate-200 px-4 py-2 text-sm text-slate-600">이 양식은 병원 정보 입력 위치가 등록되지 않았습니다.</p>}
      {pages.length > 1 && (
        <nav aria-label="미리보기 페이지" className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 px-2 py-1">
          <AdminActionButton tone="dark" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>
            <ChevronLeft size={16} aria-hidden="true" /> 이전 쪽
          </AdminActionButton>
          <span role="status" aria-atomic="true" className="text-sm text-slate-600 tabular-nums">
            {pageIndex + 1} / {pages.length}쪽
          </span>
          <AdminActionButton tone="dark" disabled={pageIndex === pages.length - 1} onClick={() => setPageIndex(pageIndex + 1)}>
            다음 쪽 <ChevronRight size={16} aria-hidden="true" />
          </AdminActionButton>
        </nav>
      )}
      <InsuranceFormPrintPages pages={pages} positions={activePositions} values={values} />
    </>}
  </>;
}
