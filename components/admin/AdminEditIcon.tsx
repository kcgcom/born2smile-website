"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminEditIconProps {
  href: string;
  label: string;
}

/**
 * 관리자에게만 보이는 아이콘 편집 버튼 (라벨 없이 아이콘만).
 * 블로그 목록 카드 등 공간이 제한된 곳에서 사용.
 */
export function AdminEditIcon({ href, label }: AdminEditIconProps) {
  const isAdmin = useAdminAuth();
  if (!isAdmin) return null;

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
      aria-label={label}
      title={label}
    >
      <Pencil size={12} aria-hidden="true" />
    </Link>
  );
}
