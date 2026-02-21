"use client";

interface AdminLoadingSkeletonProps {
  variant: "metrics" | "chart" | "table" | "full";
}

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ""}`} />;
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-gray-50 p-3 text-center">
          <Bone className="mx-auto h-8 w-16" />
          <Bone className="mx-auto mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <Bone className="mb-4 h-5 w-32" />
      <Bone className="h-32 w-full" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
      <Bone className="mb-4 h-5 w-32" />
      <div className="space-y-2">
        {(["w-full", "w-[85%]", "w-[70%]", "w-[90%]", "w-[60%]"] as const).map((w, i) => (
          <Bone key={i} className={`h-8 ${w}`} />
        ))}
      </div>
    </div>
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
          <div key={i} className="rounded-xl bg-[var(--surface)] p-4 shadow-sm">
            <Bone className="mb-4 h-5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Bone key={j} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
