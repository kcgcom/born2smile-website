"use client";

import { Pencil } from "lucide-react";
import { AdminActionLink } from "@/components/admin/AdminChrome";
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
    <AdminActionLink
      href={href}
      tone="dark"
      className="rounded-full px-3 py-1.5"
      aria-label={label}
      title={label}
    >
      <Pencil size={14} aria-hidden="true" />
      {label}
    </AdminActionLink>
  );
}
