"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { AdminActionButton } from "@/components/admin/AdminChrome";

export function CopyGuideButton({ value, label, successMessage, failureMessage }: {
  value: string;
  label: string;
  successMessage: string;
  failureMessage: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="mt-2">
      <AdminActionButton type="button" onClick={copy} tone="dark">
        <Copy size={16} aria-hidden="true" />
        {label}
      </AdminActionButton>
      <p role="status" className="mt-2 text-sm text-slate-600">
        {status === "copied" && successMessage}
        {status === "failed" && failureMessage}
      </p>
    </div>
  );
}
