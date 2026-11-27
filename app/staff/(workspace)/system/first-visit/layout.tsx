"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSurface } from "@/components/admin/AdminChrome";
import { STAFF_FIRST_VISIT, STAFF_REVIEW_GUIDE } from "@/lib/admin-access";

const GUIDE_LINKS = [
  { href: STAFF_FIRST_VISIT, label: "내원 안내" },
  { href: STAFF_REVIEW_GUIDE, label: "리뷰 안내" },
];

export default function PatientGuideLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <nav aria-label="환자 안내 링크" className="mb-5 flex gap-2 border-b border-slate-200 pb-3">
        {GUIDE_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-900"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </AdminSurface>
  );
}
