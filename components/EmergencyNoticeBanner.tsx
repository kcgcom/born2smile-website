"use client";

import { useEffect, useState } from "react";
import type { EmergencyNotice } from "@/lib/emergency-notice";

export function EmergencyNoticeBanner() {
  const [notice, setNotice] = useState<EmergencyNotice | null>(null);

  useEffect(() => {
    let request: AbortController | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      if (document.hidden || request) return;
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch("/api/emergency-notice", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const { notice: latest }: { notice: EmergencyNotice | null } = await response.json();
        if (controller.signal.aborted) return;
        clearTimeout(expiryTimer);
        const remaining = latest ? Date.parse(latest.expiresAt) - Date.now() : 0;
        setNotice(remaining > 0 ? latest : null);
        if (remaining > 0) {
          expiryTimer = setTimeout(() => setNotice(null), Math.min(remaining, 2_147_483_647));
        }
      } catch {
        // Keep the last successful response until its original expiry.
      } finally {
        request = undefined;
      }
    }

    void refresh();
    const interval = setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      request?.abort();
      clearInterval(interval);
      clearTimeout(expiryTimer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <div aria-live="polite">
      {notice && (
        <aside aria-label="긴급 공지" className="mx-auto mb-5 max-w-2xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-950">
          <p className="font-semibold">긴급 공지</p>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{notice.message}</p>
        </aside>
      )}
    </div>
  );
}
