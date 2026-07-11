import { redirect } from "next/navigation";

export default function AdminContentStrategyEvidencePage() {
  redirect("/admin/content/strategy?view=analysis");
}
