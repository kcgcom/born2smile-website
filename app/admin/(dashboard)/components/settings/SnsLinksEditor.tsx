"use client";

import { FormField, SectionShell, LoadingPlaceholder, PreviewList } from "../shared";
import { useSettingsEditor } from "./useSettingsEditor";
import type { SiteLinks } from "@/lib/site-config-supabase";

const SITE_LINK_FIELDS = [
  "kakaoChannel",
  "instagram",
  "naverBlog",
  "naverMap",
  "kakaoMap",
] as const satisfies ReadonlyArray<keyof SiteLinks>;

export function SnsLinksEditor() {
  const { form, loading, saving, saved, saveError, handleSave, setField } =
    useSettingsEditor<SiteLinks>("/api/admin/site-config/links");

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
          onChange={setField("kakaoChannel")}
          placeholder="https://pf.kakao.com/..."
        />
        <FormField
          label="인스타그램"
          value={form.instagram}
          onChange={setField("instagram")}
          placeholder="https://www.instagram.com/..."
        />
        <FormField
          label="네이버 블로그"
          value={form.naverBlog}
          onChange={setField("naverBlog")}
          placeholder="https://blog.naver.com/..."
        />
        <FormField
          label="네이버 지도"
          value={form.naverMap}
          onChange={setField("naverMap")}
          placeholder="https://naver.me/..."
        />
        <FormField
          label="카카오맵"
          value={form.kakaoMap}
          onChange={setField("kakaoMap")}
          placeholder="https://kko.to/..."
        />
      </div>
    </SectionShell>
  );
}
