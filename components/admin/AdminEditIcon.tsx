"use client";

import { Pencil } from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminChrome";

interface AdminEditIconProps {
  href: string;
  label: string;
  isAdmin: boolean;
}

/**
 * 관리자에게만 보이는 아이콘 편집 버튼 (라벨 없이 아이콘만).
 * 블로그 목록 카드 등 공간이 제한된 곳에서 사용.
 */
export function AdminEditIcon({ href, label, isAdmin }: AdminEditIconProps) {
  if (!isAdmin) return null;

  return (
    <AdminActionLink
      href={href}
      onClick={(e) => e.stopPropagation()}
      tone="dark"
      className="relative z-10 h-8 w-8 rounded-full p-0"
      aria-label={label}
      title={label}
    >
      <Pencil size={12} aria-hidden="true" />
    </AdminActionLink>
  );
}
