"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useDraftRecovery } from "@/hooks/useDraftRecovery";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

export function useSettingsEditor<T extends object>(endpoint: string) {
  const { data, loading, error, refetch } = useAdminApi<T>(endpoint);
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<T | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);
  const recovery = useDraftRecovery(form, setFormEdits, `born2smile-settings-recovery:${endpoint}`);
  const { dirty, ready, hasConflict, markSaved } = recovery;
  useUnsavedChanges(dirty || saving);

  // Background refreshes are clean only when no local edits need preserving.
  useEffect(() => {
    if (ready && !hasConflict && formEdits === null && data) markSaved(data);
  }, [data, formEdits, hasConflict, markSaved, ready]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const handleSave = async () => {
    if (!form || hasConflict || !ready || savingRef.current) return;
    savingRef.current = true;
    const submitted = form;
    setSaved(false);
    setSaveError(null);
    const { error } = await mutate(endpoint, "PUT", submitted);
    savingRef.current = false;
    if (error) {
      setSaveError(error);
    } else {
      // Clear only the submitted version. Inputs typed while PUT was pending
      // must remain editable, dirty, and eligible for a subsequent save.
      setFormEdits((current) => current && JSON.stringify(current) !== JSON.stringify(submitted) ? current : null);
      markSaved(submitted);
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

  const setField = (key: keyof T) => (value: string) =>
    updateForm((prev) => ({ ...prev, [key]: value }));

  const loadError = error ?? (!loading && data === null ? "설정 데이터가 없습니다. 다시 시도해 주세요." : null);

  return { form, data, loading, loadError, refetch, saving, saved: saved && !dirty, dirty, recovery, saveError, handleSave, updateForm, setField };
}
