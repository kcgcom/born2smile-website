import { redirect } from "next/navigation";

export default function AdminContentStrategyBriefPage() {
  redirect("/admin/content/strategy?panel=brief");
}
