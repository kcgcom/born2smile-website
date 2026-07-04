"use client";

import { FormField, SectionShell, LoadingPlaceholder } from "../shared";
import { useSettingsEditor } from "./useSettingsEditor";
import { formatClinicPhoneInput } from "@/lib/constants";
import type { SiteClinic } from "@/lib/site-config-supabase";

export function ClinicInfoEditor() {
  const { form, loading, saving, saved, dirty, saveError, handleSave, updateForm } =
    useSettingsEditor<SiteClinic>("/api/admin/site-config/clinic");

  const set = (key: keyof SiteClinic) => (value: string) =>
    updateForm((prev) => ({
      ...prev,
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
      dirty={dirty}
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
