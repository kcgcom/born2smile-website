"use client";

import { ChevronDown, Ellipsis, Plus, Search } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { INSURANCE_FORM_MAX_BYTES, INSURANCE_FORM_NAME_LENGTH, INSURANCE_FORM_URL_LENGTH, INSURANCE_FORMS_API, type InsuranceForm } from "@/lib/insurance-forms";
import { AdminErrorState } from "./AdminErrorState";
import { InsuranceFormPdfPreview } from "./InsuranceFormPdfPreview";
import { useAdminApi, useAdminMutation } from "./useAdminApi";

const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-700";
const sourceLinkClass = "inline-flex min-h-11 items-center rounded text-sm text-blue-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-700";
const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const KOREAN_INSURER_COLLATOR = new Intl.Collator("ko-KR");
const ENGLISH_INSURER_COLLATOR = new Intl.Collator("en");

function searchable(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

function compareInsurers(left: string, right: string) {
  const leftName = left.trim().normalize("NFKC");
  const rightName = right.trim().normalize("NFKC");
  const leftIsEnglish = /^[a-z]/i.test(leftName);
  const rightIsEnglish = /^[a-z]/i.test(rightName);
  if (leftIsEnglish !== rightIsEnglish) return leftIsEnglish ? 1 : -1;
  const collator = leftIsEnglish ? ENGLISH_INSURER_COLLATOR : KOREAN_INSURER_COLLATOR;
  return collator.compare(leftName, rightName);
}

export function InsuranceFormsPanel({ manage = false }: { manage?: boolean }) {
  const { data, loading, error, refetch } = useAdminApi<InsuranceForm[]>(INSURANCE_FORMS_API);
  const { mutate, loading: saving } = useAdminMutation();
  const [query, setQuery] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [confirmId, setConfirmId] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);
  const registrationDialog = useRef<HTMLDialogElement>(null);
  const selectedForm = data?.find(form => form.id === selectedId);
  const keyword = searchable(query);
  const forms = data?.filter(({ insurer, title }) => searchable(`${insurer} ${title}`).includes(keyword))
    .sort((a, b) => compareInsurers(a.insurer, b.insurer)
      || b.createdAt.localeCompare(a.createdAt));

  function clearFeedback() {
    setActionError("");
    setNotice("");
  }

  function openRegistration() {
    const dialog = registrationDialog.current;
    if (!dialog) return;
    dialog.querySelector("form")?.reset();
    dialog.querySelector("details")?.removeAttribute("open");
    setConfirmId(undefined);
    setRegistrationError("");
    clearFeedback();
    dialog.showModal();
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegistrationError("");
    const body = new FormData(event.currentTarget);
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > INSURANCE_FORM_MAX_BYTES) {
      setRegistrationError("4MB 이하의 PDF 파일을 선택해 주세요.");
      return;
    }
    const result = await mutate(INSURANCE_FORMS_API, "POST", body);
    if (result.error) {
      setRegistrationError(result.error);
      return;
    }
    registrationDialog.current?.close();
    setQuery("");
    setNotice("양식을 등록했습니다.");
    searchInput.current?.focus();
  }

  function selectForm(id: string) {
    clearFeedback();
    setSelectedId(id);
    if (window.matchMedia("(width < 64rem)").matches) {
      preview.current?.focus({ preventScroll: true });
      preview.current?.scrollIntoView({ block: "start" });
    }
  }

  async function remove(id: string) {
    clearFeedback();
    const result = await mutate(`${INSURANCE_FORMS_API}/${id}`, "DELETE");
    if (result.error) {
      setActionError(result.error);
      return;
    }
    refetch();
    setConfirmId(undefined);
    setNotice("양식을 삭제했습니다.");
    searchInput.current?.focus();
  }

  return (
    <AdminSurface tone="white" className="mx-auto max-w-7xl rounded-2xl p-4 sm:p-6">
      {manage && <dialog ref={registrationDialog} id="insurance-form-registration" aria-labelledby="insurance-form-registration-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-6"
        onCancel={(event) => { if (saving) event.preventDefault(); }}>
        <form className="space-y-3" onSubmit={register}>
          <h2 id="insurance-form-registration-title" className="text-lg font-semibold">양식 등록</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">보험사명
              <input name="insurer" className={inputClass} required maxLength={INSURANCE_FORM_NAME_LENGTH} />
            </label>
            <label className="grid gap-1 text-sm font-medium">양식명
              <input name="title" className={inputClass} required maxLength={INSURANCE_FORM_NAME_LENGTH} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">PDF 파일
            <input name="file" type="file" accept=".pdf,application/pdf" required aria-describedby="insurance-form-file-help"
              className={`${inputClass} min-w-0 py-2 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1`} />
          </label>
          <p id="insurance-form-file-help" className="text-sm text-slate-600">환자 정보가 없는 빈 양식만 등록해 주세요. PDF 한 파일당 최대 4MB입니다.</p>
          <details className="group border-t border-slate-200" onInvalidCapture={(event) => { event.currentTarget.open = true; }}>
            <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
              <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" /> 출처 주소 추가 (선택)
            </summary>
            <div className="grid gap-3 pb-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">원본 PDF 주소
                <input type="url" name="sourceUrl" className={inputClass} maxLength={INSURANCE_FORM_URL_LENGTH} placeholder="https://" />
              </label>
              <label className="grid gap-1 text-sm font-medium">보험사 안내 페이지 주소
                <input type="url" name="sourcePageUrl" className={inputClass} maxLength={INSURANCE_FORM_URL_LENGTH} placeholder="https://" />
              </label>
            </div>
          </details>
          {registrationError && <p role="alert" className="text-sm text-red-700">{registrationError}</p>}
          <div className="flex justify-end gap-2">
            <AdminActionButton type="button" tone="dark" disabled={saving} onClick={() => registrationDialog.current?.close()}>
              취소
            </AdminActionButton>
            <AdminActionButton tone="primary" type="submit" disabled={saving}>{saving ? "저장 중…" : "저장"}</AdminActionButton>
          </div>
        </form>
      </dialog>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-4">
          <h1 className="text-xl font-bold">치과보험 진료확인서</h1>
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">보험사명 또는 양식명 검색</span>
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
              <input ref={searchInput} type="search" placeholder={manage ? "보험사·양식명 검색" : "보험사명 또는 양식명 검색"} value={query}
                onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-10`} />
            </label>
            {manage && <AdminActionButton tone="dark" aria-haspopup="dialog" aria-controls="insurance-form-registration"
              className="shrink-0" disabled={saving} onClick={openRegistration}>
              <Plus size={16} aria-hidden="true" /> 양식 등록
            </AdminActionButton>}
          </div>

          {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
          {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
          {loading && <p role="status" className="text-sm text-slate-600">보험 양식을 불러오는 중…</p>}
          {error && <AdminErrorState message={error} onRetry={refetch} />}
          {forms?.length === 0 && <div className="space-y-3 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
            <p role="status">{data?.length ? "검색 조건에 맞는 양식이 없습니다." : "등록된 보험 양식이 없습니다."}</p>
            {!!data?.length && <AdminActionButton tone="dark" onClick={() => { setQuery(""); searchInput.current?.focus(); }}>
              검색 지우기
            </AdminActionButton>}
          </div>}

          {!!forms?.length && <ul aria-label="보험 양식 목록" className="grid grid-cols-2 items-start gap-2 lg:max-h-[70vh] lg:overflow-y-auto lg:p-1">
            {forms.map((form) => (
              <li key={form.id} className="relative min-w-0 rounded-xl border border-slate-200">
                <button type="button" onClick={() => selectForm(form.id)} aria-pressed={selectedId === form.id} aria-controls="insurance-form-preview"
                  className="block min-h-24 w-full rounded-xl py-3 pr-10 pl-3 text-left [overflow-wrap:anywhere] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700 aria-pressed:bg-blue-50 aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-blue-600">
                  <span className="block break-keep font-semibold">{form.insurer}</span>
                  <span className="mt-0.5 block break-keep text-sm whitespace-pre-line text-slate-600">
                    {form.insurer.trim() === "라이나생명" ? form.title.replace(/\s*(\([^()]+\))$/, "\n$1") : form.title}
                  </span>
                </button>
                <details onToggle={(event) => {
                  if (!event.currentTarget.open && confirmId === form.id && !saving) setConfirmId(undefined);
                }}>
                  <summary aria-label={`${form.insurer} ${form.title} 양식 정보`} title="양식 정보"
                    className="absolute top-0 right-0 flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
                    <Ellipsis size={20} aria-hidden="true" />
                  </summary>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-x-3">
                      <div className="flex flex-wrap items-center gap-x-4">
                        <p className="py-2 text-slate-600">등록 {dateFormat.format(new Date(form.createdAt))}</p>
                        {form.sourceUrl && <a href={form.sourceUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
                          원본 PDF<span className="sr-only"> (새 탭)</span>
                        </a>}
                        {form.sourcePageUrl && <a href={form.sourcePageUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
                          보험사 안내<span className="sr-only"> (새 탭)</span>
                        </a>}
                      </div>
                      {manage && <AdminActionButton tone="dark" disabled={saving} aria-expanded={confirmId === form.id}
                        aria-label={`${form.insurer} ${form.title} ${confirmId === form.id ? "삭제 취소" : "삭제"}`}
                        onClick={() => { clearFeedback(); setConfirmId(confirmId === form.id ? undefined : form.id); }}>
                        {confirmId === form.id ? "삭제 취소" : "삭제"}
                      </AdminActionButton>}
                    </div>
                    {manage && confirmId === form.id && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <p>이 양식과 PDF를 삭제하시겠습니까?</p>
                      <AdminActionButton tone="dark" disabled={saving} onClick={() => void remove(form.id)}>{saving ? "삭제 중…" : "삭제 확인"}</AdminActionButton>
                    </div>}
                  </div>
                </details>
              </li>
            ))}
          </ul>}
        </div>
        <section ref={preview} id="insurance-form-preview" tabIndex={-1} aria-label="양식 미리보기"
          className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-blue-700">
          <InsuranceFormPdfPreview key={selectedForm?.id} form={selectedForm ?? undefined} />
        </section>
      </div>
    </AdminSurface>
  );
}
