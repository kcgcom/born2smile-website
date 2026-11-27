"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";

function useIsStaffWorkspace() {
  const pathname = usePathname();
  return pathname === "/staff" || pathname.startsWith("/staff/");
}

export function useWorkspaceHref() {
  const staff = useIsStaffWorkspace();
  return useCallback((href: string) => staff ? href.replace(/^\/admin(?:\/content)?(?=[/?#]|$)/, "/staff") : href, [staff]);
}

export function useOwnerWorkspace() {
  const staff = useIsStaffWorkspace();
  const { access } = useAdminAuthState();
  return !staff && access?.isOwner === true;
}
