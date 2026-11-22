"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { getStaffHome } from "@/lib/admin-access";

export default function StaffHome() {
  const { access } = useAdminAuthState();
  const router = useRouter();
  useEffect(() => {
    if (access) router.replace(getStaffHome(access));
  }, [access, router]);
  return null;
}
