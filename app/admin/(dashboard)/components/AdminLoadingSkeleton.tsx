"use client";

import { AdminSurface } from "@/components/admin/AdminChrome";

interface AdminLoadingSkeletonProps {
  variant: "metrics" | "chart" | "table" | "full";
}

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--border)] ${className ?? ""}`} />;
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <AdminSurface key={i} tone="white" className="rounded-2xl p-4 text-center">
          <Bone className="mx-auto h-8 w-16" />
          <Bone className="mx-auto mt-2 h-3 w-20" />
        </AdminSurface>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <Bone className="mb-4 h-5 w-32" />
      <Bone className="h-32 w-full" />
    </AdminSurface>
  );
}

function TableSkeleton() {
  return (
    <AdminSurface tone="white" className="rounded-2xl p-5">
      <Bone className="mb-4 h-5 w-32" />
      <div className="space-y-2">
        {(["w-full", "w-[85%]", "w-[70%]", "w-[90%]", "w-[60%]"] as const).map((w, i) => (
          <Bone key={i} className={`h-8 ${w}`} />
        ))}
      </div>
    </AdminSurface>
  );
}

export function AdminLoadingSkeleton({ variant }: AdminLoadingSkeletonProps) {
  if (variant === "metrics") return <MetricsSkeleton />;
  if (variant === "chart") return <ChartSkeleton />;
  if (variant === "table") return <TableSkeleton />;

  // full: metrics + chart grid + table
  return (
    <div className="space-y-6">
      <MetricsSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <AdminSurface key={i} tone="white" className="rounded-2xl p-5">
            <Bone className="mb-4 h-5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Bone key={j} className="h-8 w-full" />
              ))}
            </div>
          </AdminSurface>
        ))}
      </div>
    </div>
  );
}
