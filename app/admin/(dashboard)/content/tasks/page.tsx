import { Suspense } from "react";
import { ContentWorkInbox } from "../../components/planner/ContentWorkInbox";
import { AdminLoadingSkeleton } from "../../components/AdminLoadingSkeleton";

export default function AdminContentTasksPage() {
  return <Suspense fallback={<AdminLoadingSkeleton variant="table" />}><ContentWorkInbox /></Suspense>;
}
