"use client";

import { getSiteConfigStatus, type SiteConfigStatus } from "@/lib/admin-data";
import { CLINIC, HOURS, DOCTORS } from "@/lib/constants";

// -------------------------------------------------------------
// Quick Links data
// -------------------------------------------------------------

const QUICK_LINKS = [
  {
    label: "Google Search Console",
    href: "https://search.google.com/search-console?resource_id=sc-domain:born2smile.co.kr",
    icon: "search" as const,
  },
  {
    label: "Google Analytics",
    href: "https://analytics.google.com/",
    icon: "chart" as const,
  },
  {
    label: "Firebase Console",
    href: "https://console.firebase.google.com/project/seoul-born2smile",
    icon: "database" as const,
  },
  {
    label: "GitHub Repository",
    href: "https://github.com/kcgcom/born2smile-website",
    icon: "code" as const,
  },
  {
    label: "네이버 플레이스",
    href: "https://new.smartplace.naver.com/",
    icon: "map" as const,
  },
] as const;

type IconType = "search" | "chart" | "database" | "code" | "map";

// -------------------------------------------------------------
// SettingsTab
// -------------------------------------------------------------

export function SettingsTab() {
  const siteConfig = getSiteConfigStatus();

  return (
    <div className="grid gap-6">
      <SiteConfigSection config={siteConfig} />
      <QuickLinksSection />
      <ClinicInfoSection />
    </div>
  );
}

// -------------------------------------------------------------
// Section 1: 사이트 설정 상태
// -------------------------------------------------------------

function SiteConfigSection({ config }: { config: SiteConfigStatus }) {
  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        사이트 설정 상태
      </h3>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* SNS 링크 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">SNS 링크</h4>
          <ul className="space-y-2">
            {config.snsLinks.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* Firebase */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Firebase</h4>
          <ul className="space-y-2">
            {config.firebase.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>

        {/* 환경변수 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">환경변수</h4>
          <ul className="space-y-2">
            {config.env.map((item) => (
              <ConfigRow key={item.label} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ConfigRow({ item }: { item: { label: string; configured: boolean } }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {item.configured ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </span>
      )}
      <span className={item.configured ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
        {item.label}
      </span>
    </li>
  );
}

// -------------------------------------------------------------
// Section 2: 빠른 링크
// -------------------------------------------------------------

function QuickLinksSection() {
  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        빠른 링크
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_LINKS.map((link) => (
          <QuickLinkCard key={link.label} link={link} />
        ))}
      </div>
    </section>
  );
}

function QuickLinkCard({
  link,
}: {
  link: { label: string; href: string; icon: IconType };
}) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-2 rounded-lg border border-[var(--border)] p-4 text-center transition-colors hover:border-[var(--color-primary)] hover:bg-blue-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-[var(--muted)]">
        <QuickLinkIcon icon={link.icon} />
      </span>
      <span className="text-xs font-medium text-[var(--foreground)] leading-tight">
        {link.label}
      </span>
    </a>
  );
}

function QuickLinkIcon({ icon }: { icon: IconType }) {
  switch (icon) {
    case "search":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      );
    case "chart":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 4-4" />
        </svg>
      );
    case "database":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
        </svg>
      );
    case "code":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case "map":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
  }
}

// -------------------------------------------------------------
// Section 3: 병원 정보 요약 (Read Only)
// -------------------------------------------------------------

function ClinicInfoSection() {
  const doctor = DOCTORS[0];

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        병원 정보 요약
      </h3>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 병원 기본 정보 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">병원 기본 정보</h4>
          <dl className="space-y-2 text-sm">
            <InfoRow label="병원명" value={CLINIC.name} />
            <InfoRow label="전화번호" value={CLINIC.phone} />
            <InfoRow label="주소" value={CLINIC.addressShort} />
            <InfoRow label="대표자" value={CLINIC.representative} />
          </dl>
        </div>

        {/* 진료시간 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">진료시간</h4>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border)]">
              {HOURS.schedule.map((s) => (
                <tr key={s.day}>
                  <td className="py-1 pr-3 text-[var(--muted)]">{s.day}</td>
                  <td className={`py-1 ${s.open ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                    {s.time}
                    {"note" in s && s.note ? (
                      <span className="ml-1 text-xs text-[var(--color-primary)]">({s.note})</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--muted)]">점심: {HOURS.lunchTime}</p>
          <p className="text-xs text-[var(--muted)]">{HOURS.closedDays}</p>
        </div>

        {/* 의료진 */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">의료진</h4>
          <dl className="space-y-2 text-sm">
            <InfoRow label="성명" value={doctor.name} />
            <InfoRow label="직위" value={doctor.title} />
            <InfoRow label="자격" value={doctor.position} />
          </dl>
        </div>
      </div>

      {/* 수정 안내 */}
      <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">ℹ 병원 정보를 수정하려면 lib/constants.ts 파일을 편집해 주세요.</p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-blue-700">
          <li>• 병원 기본 정보 → CLINIC 객체</li>
          <li>• 진료시간 → HOURS 객체</li>
          <li>• 의료진 → DOCTORS 배열</li>
        </ul>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-[var(--muted)]">{label}</dt>
      <dd className="text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
