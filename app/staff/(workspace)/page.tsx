"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { STAFF_HOME } from "@/lib/admin-access";

export default function StaffHome() {
  const { access } = useAdminAuthState();
  const router = useRouter();
  useEffect(() => {
    if (access) router.replace(STAFF_HOME);
  }, [access, router]);
  return null;
}
