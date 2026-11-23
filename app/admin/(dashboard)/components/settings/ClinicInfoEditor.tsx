"use client";

import { BriefcaseBusiness, MapPin, Phone } from "lucide-react";
import { FormField, SectionShell, LoadingPlaceholder } from "../shared";
import { AdminErrorState } from "../AdminErrorState";
import { useSettingsEditor } from "./useSettingsEditor";
import { formatClinicPhoneInput } from "@/lib/constants";
import type { SiteClinic } from "@/lib/site-config-supabase";

export function ClinicInfoEditor({ readOnly }: { readOnly: boolean }) {
  const { form, data, loading, loadError, refetch, saving, saved, dirty, recovery, saveError, handleSave, updateForm } =
    useSettingsEditor<SiteClinic>("/api/admin/site-config/clinic", { readOnly });

  const set = (key: keyof SiteClinic) => (value: string) =>
    updateForm((prev) => ({
      ...prev,
      [key]: key === "phone" ? formatClinicPhoneInput(value) : value,
    }));

  if (!form) {
    if (loading && !loadError) return <LoadingPlaceholder />;
    return <AdminErrorState message={`병원 정보 조회 실패: ${loadError ?? "설정 데이터를 불러올 수 없습니다."}`} onRetry={refetch} />;
  }

  return (
    <div role="region" aria-label="병원 정보" className="space-y-4">
      {loadError && <AdminErrorState message={`병원 정보 조회 실패: ${loadError}`} onRetry={refetch} />}
      <SectionShell
        title={data?.name || "병원명 미설정"}
        canEdit={!readOnly}
        description="사이트 전반에 쓰이는 기본 병원 정보를 관리합니다."
        preview={(
          <div className="text-[var(--foreground)]">
            <dl className="space-y-1 text-sm leading-5">
              <div className="flex items-start gap-2">
                <dt className="flex h-5 shrink-0 items-center text-slate-700">
                  <Phone className="size-3" aria-hidden="true" />
                  <span className="sr-only">전화번호</span>
                </dt>
                <dd className="min-w-0 break-words tabular-nums">{form.phone || "미설정"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex h-5 shrink-0 items-center text-slate-700">
                  <MapPin className="size-3" aria-hidden="true" />
                  <span className="sr-only">주소</span>
                </dt>
                <dd className="min-w-0 break-words break-keep">{form.address || "미설정"}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="flex h-5 shrink-0 items-center text-slate-700">
                  <BriefcaseBusiness className="size-3" aria-hidden="true" />
                  <span className="sr-only">사업자 정보</span>
                </dt>
                <dd className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words">대표 {form.representative || "미설정"}</span>
                  <span className="min-w-0 break-words tabular-nums">{form.businessNumber || "등록번호 미설정"}</span>
                </dd>
              </div>
            </dl>
          </div>
        )}
        saving={saving}
        saved={saved}
        dirty={dirty}
        recovery={recovery}
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
    </div>
  );
}
