"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Save, Loader2, Check, ChevronDown, ChevronUp, Clock3, Globe2, MapPinned } from "lucide-react";
import { AdminActionButton, AdminPill, AdminSurface } from "@/components/admin/AdminChrome";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { useAdminApi, useAdminMutation } from "./useAdminApi";
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
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "접기" : "펼치기"}
          </AdminActionButton>
          <SaveButton saving={saving} saved={saved} onClick={onSave} />
        </div>
      </div>
      {saveError && (
        <AdminNotice tone="error" className="mb-4">
          저장 실패: {saveError}
        </AdminNotice>
      )}
      {open ? children : (
        <div className="rounded-xl bg-[var(--background)]/80 px-4 py-4 text-sm text-[var(--muted)]">
          필요할 때만 상세 입력 필드를 펼쳐 수정할 수 있습니다.
        </div>
      )}
    </AdminSurface>
  );
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
      summary={`입력 완료 ${Object.values(form).filter(Boolean).length}/${Object.keys(form).length}`}
      saving={saving}
      saved={saved}
      onSave={handleSave}
      saveError={saveError}
      defaultOpen={true}
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
    setFormEdits((prev) => ({ ...(prev ?? data ?? {} as SiteClinic), [key]: value }));

  if (loading || !form) return <LoadingPlaceholder />;

  return (
    <SectionShell
      title="병원 정보"
      description="사이트 전반에 쓰이는 기본 병원 정보를 관리합니다."
      summary={`${form.name || "병원명 미설정"} · ${form.phone || "전화번호 미설정"}`}
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
          label="국제전화"
          value={form.phoneIntl}
          onChange={set("phoneIntl")}
          placeholder="+82-31-000-0000"
        />
        <FormField
          label="전화 링크"
          value={form.phoneHref}
          onChange={set("phoneHref")}
          placeholder="tel:031-000-0000"
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

  if (loading || !form) return <LoadingPlaceholder />;

  return (
    <SectionShell
      title="진료시간"
      description="요일별 운영 여부와 공지 문구를 함께 관리합니다."
      summary={`운영 ${form.schedule.filter((row) => row.open).length}일 · 휴진일 ${form.closedDays || "미설정"}`}
      saving={saving}
      saved={saved}
      onSave={handleSave}
      saveError={saveError}
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {form.schedule.map((row, i) => (
          <div
            key={row.day}
            className={`rounded-2xl border px-4 py-4 ${
              row.open
                ? "border-slate-200 bg-white/80"
                : "border-slate-200 bg-slate-50/90"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{row.day}</div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {row.open ? "운영 중" : "휴진"} · {row.note || "비고 없음"}
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
            </div>

            <div className="mt-4 space-y-3">
              <FormField
                label="진료 시간"
                value={row.time}
                onChange={(value) => setScheduleField(i, "time", value)}
                placeholder="09:30 - 18:30"
              />
              <FormField
                label="비고"
                value={row.note ?? ""}
                onChange={(value) => setScheduleField(i, "note", value)}
                placeholder="예: 야간진료"
              />
            </div>
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
    </SectionShell>
  );
}

// -------------------------------------------------------------
// SettingsTab (main)
// -------------------------------------------------------------

export function SettingsTab() {
  const { data: linksData } = useAdminApi<SiteLinks>("/api/admin/site-config/links");
  const { data: clinicData } = useAdminApi<SiteClinic>("/api/admin/site-config/clinic");
  const { data: hoursData } = useAdminApi<SiteHours>("/api/admin/site-config/hours");

  const linkConfiguredCount = linksData ? Object.values(linksData).filter(Boolean).length : 0;
  const openDays = hoursData?.schedule.filter((row) => row.open).length ?? 0;

  return (
    <div className="grid gap-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <AdminPill tone="white">사이트 설정 요약</AdminPill>
              <AdminPill tone="warning">운영 정보 변경 시 즉시 반영</AdminPill>
            </div>
            <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">사이트 전반에 쓰이는 운영 정보를 섹션별로 정리했습니다.</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              기본 병원 정보, 외부 채널 링크, 진료시간을 나눠 관리하고 필요할 때만 펼쳐 수정할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700">
                <Globe2 className="h-3.5 w-3.5" />
                외부 링크
              </div>
              <div className="mt-1 text-lg font-semibold text-blue-900">{linkConfiguredCount}/5</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <MapPinned className="h-3.5 w-3.5" />
                대표 정보
              </div>
              <div className="mt-1 text-sm font-semibold text-emerald-900">{clinicData?.name ?? "확인 중..."}</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                <Clock3 className="h-3.5 w-3.5" />
                운영 요일
              </div>
              <div className="mt-1 text-lg font-semibold text-amber-900">주 {openDays}일</div>
            </div>
          </div>
        </div>
      </AdminSurface>
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
