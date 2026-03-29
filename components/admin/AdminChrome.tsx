"use client";

import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type SurfaceTone = "dark" | "success" | "white";
type PillTone = "amber" | "sky" | "slate" | "warning" | "white";
type ActionTone = "ghost" | "primary" | "dark";

const surfaceToneClasses: Record<SurfaceTone, string> = {
  dark: "border border-slate-800/80 bg-slate-950/88 text-white shadow-lg shadow-slate-950/10 backdrop-blur-md",
  success: "border border-emerald-300/35 bg-[linear-gradient(135deg,rgba(6,78,59,0.96),rgba(2,44,34,0.94))] text-emerald-50 shadow-xl shadow-emerald-950/15 backdrop-blur-sm",
  white: "border border-slate-200/80 bg-white shadow-sm text-slate-900",
};

const pillToneClasses: Record<PillTone, string> = {
  amber: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  sky: "border-sky-300/25 bg-sky-400/10 text-sky-100",
  slate: "border-white/10 bg-white/6 text-slate-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  white: "border-slate-900/10 bg-slate-900/5 text-slate-700",
};

const actionToneClasses: Record<ActionTone, string> = {
  ghost: "border border-white/15 bg-white/8 text-white hover:bg-white/14",
  primary: "bg-[var(--color-primary)] text-white shadow-sm shadow-blue-950/20 hover:bg-[var(--color-primary-dark)]",
  dark: "border border-slate-900/12 bg-slate-950/5 text-slate-800 hover:bg-slate-950/8",
};

export const AdminSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  tone: SurfaceTone;
  children: ReactNode;
}>(
  function AdminSurface({ tone, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        {...props}
        className={cx(surfaceToneClasses[tone], className)}
      >
        {children}
      </div>
    );
  },
);

export function AdminPill({
  tone,
  className,
  children,
}: {
  tone: PillTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        pillToneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AdminActionLink({
  tone,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Link> & {
  tone: ActionTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      {...props}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
        actionToneClasses[tone],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function AdminActionButton({
  tone,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: ActionTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
        actionToneClasses[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}
