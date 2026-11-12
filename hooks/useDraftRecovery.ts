"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Draft<T> = { baseline: string; form: T };

function readDraft<T>(raw: string, sample: T): Draft<T> | null {
  try {
    const value = JSON.parse(raw);
    if (typeof value.baseline !== "string" || !value.form || typeof value.form !== "object") return null;
    // Incomplete text is allowed in drafts, but missing fields or wrong container
    // types must not crash the editor when a stored record is unreadable.
    for (const [key, item] of Object.entries(sample as object)) {
      const candidate = value.form[key];
      if (Array.isArray(item) ? !Array.isArray(candidate) : typeof candidate !== typeof item) return null;
    }
    return value as Draft<T>;
  } catch {
    return null;
  }
}

/** Tab-local recovery. Conflicts remain untouched until explicitly resolved. */
export function useDraftRecovery<T extends object>(
  form: T | null,
  restore: (value: T) => void,
  storageKey: string,
) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const [baseline, setBaseline] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState<{ raw: string; draft: Draft<T> | null } | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const dirty = ready && form !== null && JSON.stringify(form) !== baseline;

  useEffect(() => {
    if (ready || form === null) return;
    // Hydrate browser storage after the current render; a cancelled mount must
    // neither restore input nor publish a stale baseline into a new editor.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const initial = JSON.stringify(form);
      setBaseline(initial);
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const draft = readDraft(raw, form);
          if (draft && draft.baseline === initial) {
            restore(draft.form);
            setRecoveryNotice("이 탭에 보관된 미저장 내용을 복구했습니다. 서버에 반영하려면 저장해 주세요.");
          } else {
            setConflict({ raw, draft });
          }
        }
      } catch {
        setRecoveryNotice("이 브라우저에서 임시 보관을 사용할 수 없습니다. 화면을 나가기 전에 저장해 주세요.");
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [form, ready, restore, storageKey]);

  useEffect(() => {
    if (!ready || conflict || form === null) return;
    let cancelled = false;
    try {
      if (dirty) sessionStorage.setItem(storageKey, JSON.stringify({ baseline, form }));
      else sessionStorage.removeItem(storageKey);
    } catch {
      queueMicrotask(() => {
        if (!cancelled) setRecoveryNotice("이 브라우저에서 임시 보관을 사용할 수 없습니다. 화면을 나가기 전에 저장해 주세요.");
      });
    }
    return () => { cancelled = true; };
  }, [baseline, conflict, dirty, form, ready, storageKey]);

  const markSaved = useCallback((saved: T) => {
    // An old request may complete after the user has opened a new editor for
    // the same record. It must not remove that editor's recovery data.
    if (!mounted.current) return;
    setBaseline(JSON.stringify(saved));
    setRecoveryNotice(null);
    // Do not clear a conflict as a side effect of saving or revalidation.
    if (!conflict) {
      try { sessionStorage.removeItem(storageKey); } catch {}
    }
  }, [conflict, storageKey]);

  const restoreConflict = () => {
    if (!conflict?.draft) return;
    restore(conflict.draft.form);
    setConflict(null);
    setRecoveryNotice("이전 입력을 복구했습니다. 최신 내용과 비교한 뒤 저장해 주세요.");
  };

  const discardConflict = () => {
    if (!window.confirm("보관된 이전 입력을 삭제하고 현재 저장된 내용을 사용하시겠습니까?")) return;
    try {
      sessionStorage.removeItem(storageKey);
      setConflict(null);
      setRecoveryNotice(null);
    } catch {
      setRecoveryNotice("이전 입력을 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  return {
    dirty, ready, markSaved, recoveryNotice,
    hasConflict: conflict !== null,
    canRestore: Boolean(conflict?.draft),
    restoreConflict, discardConflict,
  };
}
