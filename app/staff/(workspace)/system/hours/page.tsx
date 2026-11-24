import { redirect } from "next/navigation";
import { STAFF_HOME } from "@/lib/admin-access";

export default function StaffHoursPage() {
  redirect(`${STAFF_HOME}#staff-hours`);
}
