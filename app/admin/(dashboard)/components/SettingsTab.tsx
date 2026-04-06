"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Save, Loader2, Check, PencilLine, Plus, Trash2, X } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useAdminApi, useAdminMutation } from "./useAdminApi";
import { formatClinicPhoneInput } from "@/lib/constants";
import type { SiteLinks, SiteClinic, SiteHours } from "@/lib/site-config-supabase";

// -------------------------------------------------------------
// Quick Links data
// -------------------------------------------------------------

const QUICK_LINKS = [
  {
    label: "네이버 플레이스 관리",
    href: "https://new.smartplace.naver.com/",
    icon: "map" as const,
  },
  {
    label: "Google 리뷰 관리",
    href: "https://business.google.com/",
    icon: "star" as const,
  },
  {
    label: "네이버 리뷰 보기",
    href: "https://m.place.naver.com/hospital/698879488/review/visitor",
    icon: "star" as const,
  },
] as const;

const SITE_LINK_FIELDS = [
  "kakaoChannel",
  "instagram",
  "naverBlog",
  "naverMap",
  "kakaoMap",
] as const satisfies ReadonlyArray<keyof SiteLinks>;

type IconType = "search" | "chart" | "database" | "code" | "map" | "star";

// -------------------------------------------------------------
// Shared UI components
// -------------------------------------------------------------

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[var(--background)]/85 px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
      <label className="w-28 shrink-0 text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
      />
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>불러오는 중...</span>
      </div>
    </AdminSurface>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <AdminActionButton
      onClick={onClick}
      disabled={saving}
      tone="primary"
      className="px-4"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <Check className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
    </AdminActionButton>
  );
}

function SectionShell({
  title,
  description,
  summary,
  preview,
  saving,
  saved,
  onSave,
  saveError,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  summary?: string;
  preview: ReactNode;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  saveError: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
            <AdminPill tone={saved ? "sky" : "white"} className="text-[10px]">
              {saved ? "저장 완료" : "편집 가능"}
            </AdminPill>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          {summary && (
            <p className="mt-2 text-xs text-[var(--muted)]">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AdminActionButton
            tone="dark"
            onClick={() => setOpen((current) => !current)}
            className="px-3 text-xs"
          >
            {open ? <X className="h-3.5 w-3.5" /> : <PencilLine className="h-3.5 w-3.5" />}
            {open ? "편집 닫기" : "편집"}
          </AdminActionButton>
          {open && <SaveButton saving={saving} saved={saved} onClick={onSave} />}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--background)]/72 px-4 py-4">
        {preview}
      </div>
      {saveError && (
        <AdminNotice tone="error" className="mb-4">
          저장 실패: {saveError}
        </AdminNotice>
      )}
      {open ? <div className="mt-4">{children}</div> : null}
    </AdminSurface>
  );
}

function PreviewList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-b border-slate-200/80 pb-2 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3"
        >
          <div className="w-28 shrink-0 text-xs font-medium text-[var(--muted)]">{item.label}</div>
          <div className="min-w-0 text-sm text-[var(--foreground)] break-all">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function formatExceptionDateLabel(date: string) {
  if (!date) return "날짜 미설정";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}.${month}.${day}`;
}

// -------------------------------------------------------------
// Section 1: SNS Links Editor
// -------------------------------------------------------------

function SnsLinksEditor() {
  const { data, loading, refetch } = useAdminApi<SiteLinks>(
    "/api/admin/site-config/links",
  );
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<SiteLinks | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    setSaveError(null);
    const { error } = await mutate("/api/admin/site-config/links", "PUT", form);
    if (error) {
      setSaveError(error);
    } else {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  const set = (key: keyof SiteLinks) => (value: string) =>
    setFormEdits((prev) => ({ ...(prev ?? data ?? {} as SiteLinks), [key]: value }));

  if (loading || !form) return <LoadingPlaceholder />;

  return (
    <SectionShell
      title="SNS 링크"
      description="외부 채널, 지도, 블로그 링크를 최신 상태로 유지합니다."
      summary={`입력 완료 ${SITE_LINK_FIELDS.filter((key) => Boolean(form[key])).length}/${SITE_LINK_FIELDS.length}`}
      preview={(
        <PreviewList
          items={[
            { label: "카카오 채널", value: form.kakaoChannel || "미설정" },
            { label: "인스타그램", value: form.instagram || "미설정" },
            { label: "네이버 블로그", value: form.naverBlog || "미설정" },
            { label: "네이버 지도", value: form.naverMap || "미설정" },
            { label: "카카오맵", value: form.kakaoMap || "미설정" },
          ]}
        />
      )}
      saving={saving}
      saved={saved}
      onSave={handleSave}
      saveError={saveError}
    >
      <div className="space-y-3">
        <FormField
          label="카카오 채널"
          value={form.kakaoChannel}
          onChange={set("kakaoChannel")}
          placeholder="https://pf.kakao.com/..."
        />
        <FormField
          label="인스타그램"
          value={form.instagram}
          onChange={set("instagram")}
          placeholder="https://www.instagram.com/..."
        />
        <FormField
          label="네이버 블로그"
          value={form.naverBlog}
          onChange={set("naverBlog")}
          placeholder="https://blog.naver.com/..."
        />
        <FormField
          label="네이버 지도"
          value={form.naverMap}
          onChange={set("naverMap")}
          placeholder="https://naver.me/..."
        />
        <FormField
          label="카카오맵"
          value={form.kakaoMap}
          onChange={set("kakaoMap")}
          placeholder="https://kko.to/..."
        />
      </div>
    </SectionShell>
  );
}

// -------------------------------------------------------------
// Section 2: Clinic Info Editor
// -------------------------------------------------------------

function ClinicInfoEditor() {
  const { data, loading, refetch } = useAdminApi<SiteClinic>(
    "/api/admin/site-config/clinic",
  );
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<SiteClinic | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    setSaveError(null);
    const { error } = await mutate(
      "/api/admin/site-config/clinic",
      "PUT",
      form,
    );
    if (error) {
      setSaveError(error);
    } else {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  const set = (key: keyof SiteClinic) => (value: string) =>
    setFormEdits((prev) => ({
      ...(prev ?? data ?? {} as SiteClinic),
      [key]: key === "phone" ? formatClinicPhoneInput(value) : value,
    }));

  if (loading || !form) return <LoadingPlaceholder />;

  return (
    <SectionShell
      title="병원 정보"
      description="사이트 전반에 쓰이는 기본 병원 정보를 관리합니다."
      summary={`${form.name || "병원명 미설정"} · ${form.phone || "전화번호 미설정"}`}
      preview={(
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[var(--foreground)]">{form.name || "병원명 미설정"}</div>
            <div className="text-sm text-[var(--muted)]">{form.slogan || "슬로건 미설정"}</div>
            <div className="text-sm text-[var(--foreground)]">{form.phone || "전화번호 미설정"}</div>
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="mr-2 text-[var(--muted)]">주소</span>{form.addressShort || form.address || "미설정"}</div>
            <div><span className="mr-2 text-[var(--muted)]">지역</span>{form.neighborhood || "미설정"}</div>
            <div><span className="mr-2 text-[var(--muted)]">대표자</span>{form.representative || "미설정"}</div>
          </div>
        </div>
      )}
      saving={saving}
      saved={saved}
      onSave={handleSave}
      saveError={saveError}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          label="병원명"
          value={form.name}
          onChange={set("name")}
          placeholder="서울본치과의원"
        />
        <FormField
          label="영문명"
          value={form.nameEn}
          onChange={set("nameEn")}
          placeholder="Seoul Born Dental Clinic"
        />
        <div className="md:col-span-2">
          <FormField
            label="슬로건"
            value={form.slogan}
            onChange={set("slogan")}
            placeholder="정직한 진료, 따뜻한 미소"
          />
        </div>
        <FormField
          label="전화번호"
          value={form.phone}
          onChange={set("phone")}
          placeholder="031-000-0000"
        />
        <FormField
          label="지역"
          value={form.neighborhood}
          onChange={set("neighborhood")}
          placeholder="김포"
        />
        <div className="md:col-span-2">
          <FormField
            label="주소"
            value={form.address}
            onChange={set("address")}
            placeholder="경기도 김포시 ..."
          />
        </div>
        <div className="md:col-span-2">
          <FormField
            label="짧은 주소"
            value={form.addressShort}
            onChange={set("addressShort")}
            placeholder="김포시 ..."
          />
        </div>
        <FormField
          label="사업자번호"
          value={form.businessNumber}
          onChange={set("businessNumber")}
          placeholder="000-00-00000"
        />
        <FormField
          label="대표자"
          value={form.representative}
          onChange={set("representative")}
          placeholder="홍길동"
        />
      </div>
    </SectionShell>
  );
}

// -------------------------------------------------------------
// Section 3: Hours Editor
// -------------------------------------------------------------

function HoursEditor() {
  const { data, loading, refetch } = useAdminApi<SiteHours>(
    "/api/admin/site-config/hours",
  );
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<SiteHours | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    setSaveError(null);
    const { error } = await mutate(
      "/api/admin/site-config/hours",
      "PUT",
      form,
    );
    if (error) {
      setSaveError(error);
    } else {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  const setScheduleField = (
    index: number,
    key: "time" | "open" | "note",
    value: string | boolean,
  ) => {
    setFormEdits((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      const schedule = base.schedule.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      );
      return { ...base, schedule };
    });
  };

  const setTop = (key: "lunchTime" | "closedDays" | "notice") => (value: string) =>
    setFormEdits((prev) => ({ ...(prev ?? data ?? {} as SiteHours), [key]: value }));

  const setExceptionField = (
    index: number,
    key: "date" | "time" | "open" | "note",
    value: string | boolean,
  ) => {
    setFormEdits((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      const exceptions = (base.exceptions ?? []).map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      );
      return { ...base, exceptions };
    });
  };

  const addException = () => {
    setFormEdits((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      return {
        ...base,
        exceptions: [
          ...(base.exceptions ?? []),
          { date: "", open: false, time: "휴진", note: "" },
        ],
      };
    });
  };

  const removeException = (index: number) => {
    setFormEdits((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      return {
        ...base,
        exceptions: (base.exceptions ?? []).filter((_, i) => i !== index),
      };
    });
  };

  if (loading || !form) return <LoadingPlaceholder />;

  return (
    <SectionShell
      title="진료시간"
      description="요일별 운영 여부와 공지 문구를 함께 관리합니다."
      summary={`운영 ${form.schedule.filter((row) => row.open).length}일 · 휴진일 ${form.closedDays || "미설정"}`}
      preview={(
        <div className="space-y-2">
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {form.schedule.map((row) => (
              <div key={row.day} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 text-[var(--foreground)]">
                  {row.day}
                  {row.note ? <span className="ml-1 text-xs text-[var(--muted)]">({row.note})</span> : null}
                </div>
                <div className={row.open ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>{row.time}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-2 text-sm text-[var(--muted)]">
            점심시간 {form.lunchTime || "미설정"} · {form.closedDays || "휴진일 미설정"}
            {form.notice ? <span className="block pt-1">{form.notice}</span> : null}
          </div>
          {form.exceptions.length > 0 ? (
            <div className="border-t border-slate-200 pt-2">
              <div className="mb-2 text-xs font-medium text-[var(--muted)]">운영 예외 / 날짜별 공지</div>
              <div className="space-y-1">
                {form.exceptions.map((exception, index) => (
                  <div key={`${exception.date || "new"}-${index}`} className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium text-[var(--foreground)]">{formatExceptionDateLabel(exception.date)}</span>
                    <span className={exception.open ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
                      {exception.time || (exception.open ? "운영시간 미설정" : "휴진")}
                    </span>
                    {exception.note ? <span className="text-[var(--muted)]">· {exception.note}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
      saving={saving}
      saved={saved}
      onSave={handleSave}
      saveError={saveError}
    >
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {form.schedule.map((row, i) => (
          <div
            key={row.day}
            className={`grid gap-3 px-4 py-4 md:grid-cols-[88px_92px_minmax(0,1fr)_minmax(0,1fr)] md:items-center ${
              i === 0 ? "" : "border-t border-slate-100"
            } ${row.open ? "bg-white" : "bg-slate-50/90"}`}
          >
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{row.day}</div>
              <div className="mt-1 text-xs text-[var(--muted)] md:hidden">
                {row.open ? "운영 중" : "휴진"}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <input
                type="checkbox"
                checked={row.open}
                onChange={(e) => setScheduleField(i, "open", e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
              />
              운영
            </label>

            <input
              type="text"
              value={row.time}
              onChange={(e) => setScheduleField(i, "time", e.target.value)}
              placeholder="09:30 - 18:30"
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
              aria-label={`${row.day} 진료 시간`}
            />

            <input
              type="text"
              value={row.note ?? ""}
              onChange={(e) => setScheduleField(i, "note", e.target.value)}
              placeholder="예: 야간진료"
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
              aria-label={`${row.day} 비고`}
            />
          </div>
        ))}
      </div>

      {/* Additional fields */}
      <div className="space-y-3">
        <FormField
          label="점심시간"
          value={form.lunchTime}
          onChange={setTop("lunchTime")}
          placeholder="13:00 - 14:00"
        />
        <FormField
          label="휴진일"
          value={form.closedDays}
          onChange={setTop("closedDays")}
          placeholder="일요일, 공휴일 휴진"
        />
        <FormField
          label="공지사항"
          value={form.notice}
          onChange={setTop("notice")}
          placeholder="토요일 점심시간 없이 진료"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">운영 예외 / 날짜별 공지</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">
              특정 날짜 휴진, 단축 진료, 추가 진료 같은 예외 운영을 등록합니다.
            </p>
          </div>
          <AdminActionButton tone="dark" onClick={addException} className="px-3 text-xs">
            <Plus className="h-3.5 w-3.5" />
            예외 추가
          </AdminActionButton>
        </div>

        {form.exceptions.length === 0 ? (
          <div className="rounded-xl bg-[var(--background)]/72 px-4 py-3 text-sm text-[var(--muted)]">
            등록된 예외 일정이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {form.exceptions.map((exception, index) => (
              <div
                key={`${exception.date || "new"}-${index}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-[var(--background)]/72 p-4 md:grid-cols-[160px_96px_minmax(0,1fr)_minmax(0,1fr)_84px] md:items-center"
              >
                <input
                  type="date"
                  value={exception.date}
                  onChange={(e) => setExceptionField(index, "date", e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 날짜`}
                />
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={exception.open}
                    onChange={(e) => setExceptionField(index, "open", e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                  운영
                </label>
                <input
                  type="text"
                  value={exception.time}
                  onChange={(e) => setExceptionField(index, "time", e.target.value)}
                  placeholder={exception.open ? "10:00 - 15:00" : "휴진"}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 시간`}
                />
                <input
                  type="text"
                  value={exception.note ?? ""}
                  onChange={(e) => setExceptionField(index, "note", e.target.value)}
                  placeholder="예: 현충일 휴진"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  aria-label={`예외 일정 ${index + 1} 비고`}
                />
                <AdminActionButton
                  tone="ghost"
                  onClick={() => removeException(index)}
                  className="px-3 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </AdminActionButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}

// -------------------------------------------------------------
// SettingsTab (main)
// -------------------------------------------------------------

export function SettingsTab() {
  return (
    <div className="grid gap-6">
      <SnsLinksEditor />
      <ClinicInfoEditor />
      <HoursEditor />
      <QuickLinksSection />
    </div>
  );
}

// -------------------------------------------------------------
// QuickLinksSection (unchanged)
// -------------------------------------------------------------

function QuickLinksSection() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-[var(--foreground)]">빠른 링크</h3>
        <AdminPill tone="white" className="text-[10px]">외부 도구</AdminPill>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        자주 여는 외부 운영 도구로 바로 이동할 수 있습니다.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <QuickLinkCard key={link.label} link={link} />
        ))}
      </div>
    </AdminSurface>
  );
}

function QuickLinkCard({
  link,
}: {
  link: { label: string; href: string; icon: IconType };
}) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)]/85 p-4 text-center transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-[var(--muted)]" aria-hidden="true">
        <QuickLinkIcon icon={link.icon} />
      </span>
      <span className="text-xs font-medium text-[var(--foreground)] leading-tight">
        {link.label}
        <span className="sr-only"> (새 창에서 열림)</span>
      </span>
    </a>
  );
}

function QuickLinkIcon({ icon }: { icon: IconType }) {
  switch (icon) {
    case "search":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "chart":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 4-4" />
        </svg>
      );
    case "database":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
        </svg>
      );
    case "code":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "map":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "star":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
  }
}
