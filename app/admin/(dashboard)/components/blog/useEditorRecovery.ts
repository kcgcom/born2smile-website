"use client";

import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { BlogEditorData } from "./useBlogEditorForm";

export function useEditorRecovery(
  form: BlogEditorData,
  setForm: (data: BlogEditorData) => void,
  identity: string,
) {
  const recovery = useDraftRecovery(form, (draft) => {
    // Recover content without reverting a publication or renaming a published URL.
    setForm({ ...draft, published: form.published, date: form.date, slug: form.published ? form.slug : draft.slug });
  }, `born2smile-editor-recovery:${identity}`);
  const confirmLeave = useUnsavedChanges(recovery.dirty);
  return { ...recovery, confirmLeave };
}
