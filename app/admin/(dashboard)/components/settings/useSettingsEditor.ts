"use client";

import { useState, useMemo } from "react";
import { useAdminApi, useAdminMutation } from "../useAdminApi";

export function useSettingsEditor<T>(endpoint: string) {
  const { data, loading, refetch } = useAdminApi<T>(endpoint);
  const { mutate, loading: saving } = useAdminMutation();
  const [formEdits, setFormEdits] = useState<T | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useMemo(() => formEdits ?? data ?? null, [formEdits, data]);

  const handleSave = async () => {
    if (!form) return;
    setSaveError(null);
    const { error } = await mutate(endpoint, "PUT", form);
    if (error) {
      setSaveError(error);
    } else {
      setFormEdits(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    }
  };

  const updateForm = (updater: (prev: T) => T) => {
    setFormEdits((prev) => {
      const base = prev ?? data;
      if (!base) return prev;
      return updater(base);
    });
  };

  const setField = (key: keyof T) => (value: string) =>
    setFormEdits((prev) => ({ ...(prev ?? data ?? {} as T), [key]: value }));

  return { form, data, loading, saving, saved, saveError, handleSave, updateForm, setField };
}
