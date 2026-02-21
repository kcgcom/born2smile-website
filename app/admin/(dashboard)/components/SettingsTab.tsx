"use client";

import { useState, useMemo } from "react";
import { Save, Loader2, Check } from "lucide-react";
import { useAdminApi, useAdminMutation } from "./useAdminApi";

// -------------------------------------------------------------
// Local type definitions (mirror lib/site-config-firestore.ts)
// -------------------------------------------------------------

type SiteLinks = {
  kakaoChannel: string;
  instagram: string;
  naverBlog: string;
  naverMap: string;
  kakaoMap: string;
};

type SiteClinic = {
  name: string;
  nameEn: string;
  slogan: string;
  phone: string;
  phoneIntl: string;
  phoneHref: string;
  address: string;
  addressShort: string;
  neighborhood: string;
  businessNumber: string;
  representative: string;
};

type SiteHours = {
  schedule: Array<{ day: string; time: string; open: boolean; note?: string }>;
  lunchTime: string;
  closedDays: string;
  notice: string;
};

// -------------------------------------------------------------
// Quick Links data
// -------------------------------------------------------------

const QUICK_LINKS = [
  {
    label: "Google Search Console",
    href: "https://search.google.com/search-console?resource_id=sc-domain:born2smile.co.kr",
    icon: "search" as const,
  },
  {
    label: "Google Analytics",
    href: "https://analytics.google.com/",
    icon: "chart" as const,
  },
  {
    label: "Firebase Console",
    href: "https://console.firebase.google.com/project/seoul-born2smile",
    icon: "database" as const,
  },
  {
    label: "GitHub Repository",
    href: "https://github.com/kcgcom/born2smile-website",
    icon: "code" as const,
  },
  {
    label: "네이버 플레이스",
    href: "https://new.smartplace.naver.com/",
    icon: "map" as const,
  },
] as const;

type IconType = "search" | "chart" | "database" | "code" | "map";

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
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>불러오는 중...</span>
      </div>
    </section>
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
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <Check className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
    </button>
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
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    const { error } = await mutate("/api/admin/site-config/links", "PUT", form);
    if (!error) {
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--foreground)]">SNS 링크</h3>
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
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
    </section>
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
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    const { error } = await mutate(
      "/api/admin/site-config/clinic",
      "PUT",
      form,
    );
    if (!error) {
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--foreground)]">병원 정보</h3>
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>
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
    </section>
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
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    const { error } = await mutate(
      "/api/admin/site-config/hours",
      "PUT",
      form,
    );
    if (!error) {
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--foreground)]">진료시간</h3>
        <SaveButton saving={saving} saved={saved} onClick={handleSave} />
      </div>

      {/* Schedule table */}
      <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--background)] text-[var(--muted)]">
              <th className="py-2 pl-4 pr-2 text-left font-medium">요일</th>
              <th className="px-2 py-2 text-left font-medium">시간</th>
              <th className="px-2 py-2 text-center font-medium">운영</th>
              <th className="px-2 py-2 pl-2 pr-4 text-left font-medium">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {form.schedule.map((row, i) => (
              <tr key={row.day}>
                <td className="py-2 pl-4 pr-2 font-medium text-[var(--foreground)]">
                  {row.day}
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={row.time}
                    onChange={(e) => setScheduleField(i, "time", e.target.value)}
                    className="w-36 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/15"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={row.open}
                    onChange={(e) => setScheduleField(i, "open", e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                  />
                </td>
                <td className="px-2 py-1.5 pr-4">
                  <input
                    type="text"
                    value={row.note ?? ""}
                    onChange={(e) => setScheduleField(i, "note", e.target.value)}
                    placeholder="예: 야간진료"
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-light)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/15"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </section>
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
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        빠른 링크
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_LINKS.map((link) => (
          <QuickLinkCard key={link.label} link={link} />
        ))}
      </div>
    </section>
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
      className="flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] p-4 text-center transition-colors hover:border-[var(--color-primary)] hover:bg-blue-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--background)] text-[var(--muted)]">
        <QuickLinkIcon icon={link.icon} />
      </span>
      <span className="text-xs font-medium text-[var(--foreground)] leading-tight">
        {link.label}
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
  }
}
