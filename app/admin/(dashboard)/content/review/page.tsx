import { redirect } from "next/navigation";

export default function AdminPublicationReviewPage() {
  redirect("/admin/content/tasks?stage=review#pending-revisions");
}
