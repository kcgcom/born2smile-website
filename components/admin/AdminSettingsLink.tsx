"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface AdminSettingsLinkProps {
  tab?: string;
}

/**
 * 관리자에게만 보이는 설정 편집 링크.
 * Footer 등 서버 컴포넌트의 설정 영역에 삽입하여 사용.
 */
export function AdminSettingsLink({ tab = "settings" }: AdminSettingsLinkProps) {
  const isAdmin = useAdminAuth();
  if (!isAdmin) return null;

  return (
    <Link
      href={`/admin?tab=${tab}`}
      className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
      title="설정 편집"
    >
      <Pencil size={11} aria-hidden="true" />
      편집
    </Link>
  );
}
