"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

export function useSettingsEditor<T extends object>(endpoint: string, options?: {
  readOnly?: boolean;
  patch?: (form: T) => Partial<T>;
  persistDraft?: boolean;
}) {
  const { readOnly = false, patch, persistDraft = true } = options ?? {};
  const { data, loading, error, refetch } = useAdminApi<T>(endpoint);
  const { mutate, loading: saving } = useAdminMutation<{ fallbackSync?: string }>();
  const [formEdits, setFormEdits] = useState<T | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fallbackSyncFailed, setFallbackSyncFailed] = useState(false);
  const savingRef = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useMemo(() => (readOnly ? data : formEdits ?? data) ?? null, [readOnly, formEdits, data]);
  const recovery = useDraftRecovery(readOnly ? null : form, setFormEdits, `born2smile-settings-recovery:${endpoint}${patch ? ":patch" : ""}`, persistDraft);
  const { dirty, ready, hasConflict, markSaved } = recovery;
  const loadError = error ?? (!loading && data === null ? "설정 데이터가 없습니다. 다시 시도해 주세요." : null);
  useUnsavedChanges(dirty || saving);

  // Background refreshes are clean only when no local edits need preserving.
  useEffect(() => {
    if (ready && !hasConflict && formEdits === null && data) markSaved(data);
  }, [data, formEdits, hasConflict, markSaved, ready]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const handleSave = async () => {
    if (readOnly || !form || !data || loadError || hasConflict || !ready || savingRef.current) return;
    savingRef.current = true;
    const submitted = form;
    setSaved(false);
    setSaveError(null);
    const { data: result, error } = await mutate(endpoint, patch ? "PATCH" : "PUT", patch ? patch(submitted) : submitted);
    savingRef.current = false;
    if (error) {
      setSaveError(error);
    } else {
      // Clear only the submitted version. Inputs typed while PUT was pending
      // must remain editable, dirty, and eligible for a subsequent save.
      setFormEdits((current) => current && JSON.stringify(current) !== JSON.stringify(submitted) ? current : null);
      markSaved(submitted);
      setFallbackSyncFailed(result?.fallbackSync === "failed");
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    }
  };

  const updateForm = (updater: (prev: T) => T) => {
    setSaved(false);
    setFormEdits((prev) => {
      const base = prev ?? data;
      return base ? updater(base) : prev;
    });
  };

  const discardChanges = () => {
    if (!data || !ready || !dirty || hasConflict || savingRef.current) return false;
    setFormEdits(null);
    setSaved(false);
    setSaveError(null);
    markSaved(data);
    return true;
  };

  const setField = (key: keyof T) => (value: string) =>
    updateForm((prev) => ({ ...prev, [key]: value }));

  return { form, data, loading, loadError, refetch, saving, saved: saved && !dirty, dirty, recovery, saveError, fallbackSyncFailed, handleSave, discardChanges, updateForm, setField };
}
