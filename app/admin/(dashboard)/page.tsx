"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { signOutAdmin } from "@/lib/admin-auth";
import { CLINIC } from "@/lib/constants";
import {
  getImprovementStats,
  getBlogStats,
  getSiteConfigStatus,
  IMPROVEMENT_ITEMS,
  type ImprovementStats,
  type BlogStats,
  type SiteConfigStatus,
} from "@/lib/admin-data";

// -------------------------------------------------------------
// 대시보드 메인 페이지
// -------------------------------------------------------------

export default function AdminDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (u) => setUser(u));
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOutAdmin();
    router.replace("/admin/login");
  };

  const improvementStats = getImprovementStats();
  const blogStats = getBlogStats();
  const siteConfig = getSiteConfigStatus();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* 헤더 */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {CLINIC.name}
            </h1>
            <span className="rounded-md bg-[var(--color-primary)] px-2 py-0.5 text-xs font-medium text-white">
              관리자
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[var(--muted)] sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-gray-50 hover:text-[var(--foreground)]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">대시보드</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 섹션 1: 개선 항목 현황 */}
          <ImprovementSection stats={improvementStats} />

          {/* 섹션 2: 블로그 포스트 현황 */}
          <BlogSection stats={blogStats} />

          {/* 섹션 3: 사이트 설정 상태 */}
          <SiteConfigSection config={siteConfig} />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 개선 항목 현황
// -------------------------------------------------------------

function ImprovementSection({ stats }: { stats: ImprovementStats }) {
  const pct = Math.round((stats.done / stats.total) * 100);
  const ownerItems = IMPROVEMENT_ITEMS.filter((i) => i.status === "owner-decision");

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        개선 항목 현황
      </h3>

      {/* 전체 진행률 */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">전체 진행률</span>
          <span className="font-semibold text-[var(--foreground)]">
            {stats.done}/{stats.total} ({pct}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 우선순위별 완료율 */}
      <div className="mb-4 space-y-2">
        {stats.byPriority.map((bp) => (
          <div key={bp.priority} className="flex items-center gap-3 text-sm">
            <PriorityBadge priority={bp.priority} />
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{
                    width: bp.total > 0 ? `${(bp.done / bp.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
            <span className="w-12 text-right text-[var(--muted)]">
              {bp.done}/{bp.total}
            </span>
          </div>
        ))}
      </div>

      {/* 오너 결정 필요 항목 */}
      {ownerItems.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-gold-dark)]">
            오너 결정 필요 ({ownerItems.length}건)
          </h4>
          <ul className="space-y-2">
            {ownerItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg bg-amber-50 px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    MEDIUM: "bg-blue-100 text-blue-700",
    LOW: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-block w-20 rounded px-2 py-0.5 text-center text-xs font-semibold ${styles[priority] ?? styles.LOW}`}
    >
      {priority}
    </span>
  );
}

// -------------------------------------------------------------
// 블로그 포스트 현황
// -------------------------------------------------------------

function BlogSection({ stats }: { stats: BlogStats }) {
  const maxCount = Math.max(...stats.byCategory.map((c) => c.count), 1);

  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">
        블로그 포스트 현황
      </h3>

      {/* 요약 수치 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="전체" value={stats.total} />
        <StatCard label="발행" value={stats.published} color="text-green-600" />
        <StatCard label="예약" value={stats.scheduled} color="text-[var(--color-gold)]" />
      </div>

      {/* 카테고리별 분포 */}
      <div className="mb-4">
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          카테고리별 분포
        </h4>
        <div className="space-y-2">
          {stats.byCategory.map((c) => (
            <div key={c.category} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-[var(--muted)]">
                {c.category}
              </span>
              <div className="flex-1">
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className="flex h-full items-center rounded bg-[var(--color-primary)] px-2 text-xs font-medium text-white transition-all"
                    style={{ width: `${(c.count / maxCount) * 100}%`, minWidth: "2rem" }}
                  >
                    {c.count}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 예약 발행 대기 */}
      {stats.scheduledPosts.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
            예약 발행 대기
          </h4>
          <ul className="space-y-1.5">
            {stats.scheduledPosts.map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="truncate text-[var(--foreground)]">{p.title}</span>
                <span className="ml-2 shrink-0 text-xs text-[var(--muted)]">{p.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  color = "text-[var(--foreground)]",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

// -------------------------------------------------------------
// 사이트 설정 상태
// -------------------------------------------------------------

function SiteConfigSection({ config }: { config: SiteConfigStatus }) {
  return (
    <section className="rounded-xl bg-[var(--surface)] p-6 shadow-sm lg:col-span-2">
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
