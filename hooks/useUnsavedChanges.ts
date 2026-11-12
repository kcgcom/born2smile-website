"use client";

import { useCallback, useEffect } from "react";

const DIRTY_EDITORS = new Set<symbol>();
const LEAVE_MESSAGE = "저장하지 않은 변경사항이 있습니다. 이 화면을 나가시겠습니까?";

function beforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = "";
}

function guardNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest("a[href]");
  if (anchor instanceof HTMLAnchorElement) {
    if (anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const next = new URL(anchor.href, location.href);
    if (next.origin === location.origin && next.pathname === location.pathname && next.search === location.search) return;
  } else if (!target?.closest("[data-confirm-navigation]")) {
    return;
  }
  if (!window.confirm(LEAVE_MESSAGE)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** One confirmation even when several settings sections have unsaved changes. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const editor = Symbol();
    if (DIRTY_EDITORS.size === 0) {
      window.addEventListener("beforeunload", beforeUnload);
      document.addEventListener("click", guardNavigation, true);
    }
    DIRTY_EDITORS.add(editor);
    return () => {
      DIRTY_EDITORS.delete(editor);
      if (DIRTY_EDITORS.size === 0) {
        window.removeEventListener("beforeunload", beforeUnload);
        document.removeEventListener("click", guardNavigation, true);
      }
    };
  }, [dirty]);

  return useCallback(() => !dirty || window.confirm(LEAVE_MESSAGE), [dirty]);
}
