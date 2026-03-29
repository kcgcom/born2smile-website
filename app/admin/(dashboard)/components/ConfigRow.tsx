// Shared component used by ProjectTab and SettingsTab

import { AdminPill } from "@/components/admin/AdminChrome";

export interface ConfigItem {
  label: string;
  configured: boolean;
}

export function ConfigRow({ item }: { item: ConfigItem }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {item.configured ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted-light)]">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </span>
        )}
        <span className={item.configured ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
          {item.label}
        </span>
      </div>
      <AdminPill tone={item.configured ? "sky" : "white"} className="shrink-0 text-[10px]">
        {item.configured ? "설정 완료" : "미설정"}
      </AdminPill>
    </li>
  );
}
