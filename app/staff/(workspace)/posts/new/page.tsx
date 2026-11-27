import { redirect } from "next/navigation";
import { STAFF_POSTS } from "@/lib/admin-access";

export default function StaffNewPostPage() {
  redirect(STAFF_POSTS);
}
