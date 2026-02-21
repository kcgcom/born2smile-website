"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminEditButtonProps {
  href: string;
  label?: string;
}

/**
 * 관리자에게만 보이는 편집 버튼 (라벨 포함).
 * 블로그 상세 페이지 등 서버 컴포넌트에 삽입하여 사용.
 */
export function AdminEditButton({ href, label = "수정" }: AdminEditButtonProps) {
  const isAdmin = useAdminAuth();
  if (!isAdmin) return null;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      aria-label={label}
      title={label}
    >
      <Pencil size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
