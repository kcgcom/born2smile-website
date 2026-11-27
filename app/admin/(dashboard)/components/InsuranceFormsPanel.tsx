"use client";

import { FileText, Printer, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { INSURANCE_FORM_MAX_BYTES, INSURANCE_FORM_NAME_LENGTH, INSURANCE_FORM_URL_LENGTH, INSURANCE_FORMS_API, type InsuranceForm } from "@/lib/insurance-forms";
import { AdminErrorState } from "./AdminErrorState";
import { fetchAdminResponse, useAdminApi, useAdminMutation } from "./useAdminApi";

const inputClass = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-700";
const sourceLinkClass = "inline-flex min-h-11 items-center rounded text-sm text-blue-800 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-700";
const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });

function searchable(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

export function InsuranceFormsPanel({ manage = false }: { manage?: boolean }) {
  const { data, loading, error, refetch } = useAdminApi<InsuranceForm[]>(INSURANCE_FORMS_API);
  const { mutate, loading: saving } = useAdminMutation();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string>();
  const [openingId, setOpeningId] = useState<string>();
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const keyword = searchable(query);
  const forms = data?.filter(({ insurer, title }) => searchable(`${insurer} ${title}`).includes(keyword))
    .sort((a, b) => a.insurer.localeCompare(b.insurer, "ko-KR") || b.createdAt.localeCompare(a.createdAt));

  function clearFeedback() {
    setActionError("");
    setNotice("");
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    const body = new FormData(event.currentTarget);
    const file = body.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > INSURANCE_FORM_MAX_BYTES) {
      setActionError("4MB 이하의 PDF 파일을 선택해 주세요.");
      return;
    }
    const result = await mutate(INSURANCE_FORMS_API, "POST", body);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    setAdding(false);
    setQuery("");
    setNotice("양식을 등록했습니다.");
  }

  async function openPdf(id: string) {
    clearFeedback();
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      setActionError("팝업 차단을 해제한 뒤 다시 열어 주세요.");
      return;
    }
    tab.opener = null;
    setOpeningId(id);
    try {
      const response = await fetchAdminResponse(`${INSURANCE_FORMS_API}/${id}`);
      const { data: { url } } = await response.json() as { data: { url: string } };
      tab.location.replace(url);
    } catch (failure) {
      tab.close();
      setActionError(failure instanceof Error ? failure.message : "양식 파일을 열 수 없습니다.");
    } finally {
      setOpeningId(undefined);
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
  }

  return (
    <AdminSurface tone="white" className="space-y-5 rounded-2xl p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">치과보험 진료확인서 양식</h1>
          <p className="mt-2 text-sm text-slate-600">보험사별 PDF를 열고 PDF 뷰어에서 인쇄하세요.</p>
        </div>
        {manage && <AdminActionButton tone="primary" aria-expanded={adding} aria-controls="insurance-form-registration"
          disabled={saving} onClick={() => { setAdding(!adding); setConfirmId(undefined); clearFeedback(); }}>
          <Plus size={16} aria-hidden="true" /> 양식 등록
        </AdminActionButton>}
      </header>

      {adding && <form id="insurance-form-registration" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={register}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">보험사명
            <input name="insurer" className={inputClass} required maxLength={INSURANCE_FORM_NAME_LENGTH} />
          </label>
          <label className="grid gap-1 text-sm font-medium">양식명
            <input name="title" className={inputClass} required maxLength={INSURANCE_FORM_NAME_LENGTH} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">원본 PDF 주소 (선택)
            <input type="url" name="sourceUrl" className={inputClass} maxLength={INSURANCE_FORM_URL_LENGTH} placeholder="https://" />
          </label>
          <label className="grid gap-1 text-sm font-medium">보험사 안내 페이지 주소 (선택)
            <input type="url" name="sourcePageUrl" className={inputClass} maxLength={INSURANCE_FORM_URL_LENGTH} placeholder="https://" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">PDF 파일
          <input name="file" type="file" accept=".pdf,application/pdf" required aria-describedby="insurance-form-file-help"
            className={`${inputClass} py-2 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1`} />
        </label>
        <p id="insurance-form-file-help" className="text-sm text-slate-600">환자 정보가 없는 빈 양식만 등록해 주세요. PDF 한 파일당 최대 4MB입니다.</p>
        <AdminActionButton tone="primary" type="submit" disabled={saving}>{saving ? "저장 중…" : "저장"}</AdminActionButton>
      </form>}

      <label className="grid max-w-md gap-1 text-sm font-medium">보험사명 또는 양식명 검색
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={inputClass} />
      </label>

      {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {loading && <p role="status" className="text-sm text-slate-600">보험 양식을 불러오는 중…</p>}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      {forms?.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">
        {data?.length ? "검색 조건에 맞는 양식이 없습니다." : "등록된 보험 양식이 없습니다."}
      </p>}

      {!!forms?.length && <ul className="divide-y divide-slate-200 border-t border-slate-200">
        {forms.map((form) => (
          <li key={form.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <FileText size={20} className="mt-1 shrink-0 text-slate-500" aria-hidden="true" />
              <div className="min-w-0 break-words">
                <p className="text-sm text-slate-600">{form.insurer}</p>
                <p className="font-semibold">{form.title}</p>
                <p className="text-xs text-slate-600">등록 {dateFormat.format(new Date(form.createdAt))}</p>
                {(form.sourceUrl || form.sourcePageUrl) && <div className="flex flex-wrap gap-x-4">
                  {form.sourceUrl && <a href={form.sourceUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
                    원본 PDF<span className="sr-only"> (새 탭)</span>
                  </a>}
                  {form.sourcePageUrl && <a href={form.sourcePageUrl} target="_blank" rel="noreferrer" className={sourceLinkClass}>
                    보험사 안내<span className="sr-only"> (새 탭)</span>
                  </a>}
                </div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminActionButton tone="dark" disabled={Boolean(openingId)} onClick={() => void openPdf(form.id)}
                aria-label={`${form.insurer} ${form.title} PDF 열기 및 인쇄 (새 탭)`}>
                <Printer size={16} aria-hidden="true" /> {openingId === form.id ? "여는 중…" : "PDF 열기·인쇄"}
              </AdminActionButton>
              {manage && confirmId !== form.id && <AdminActionButton tone="dark" disabled={saving}
                aria-label={`${form.insurer} ${form.title} 삭제`} onClick={() => { clearFeedback(); setConfirmId(form.id); setAdding(false); }}>
                삭제
              </AdminActionButton>}
            </div>
            {manage && confirmId === form.id && <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm">
              <p>이 양식과 PDF를 삭제하시겠습니까?</p>
              <AdminActionButton tone="dark" disabled={saving} onClick={() => void remove(form.id)}>{saving ? "삭제 중…" : "삭제 확인"}</AdminActionButton>
              <AdminActionButton tone="dark" disabled={saving} onClick={() => { setConfirmId(undefined); clearFeedback(); }}>취소</AdminActionButton>
            </div>}
          </li>
        ))}
      </ul>}
    </AdminSurface>
  );
}
