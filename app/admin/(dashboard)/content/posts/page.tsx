import { Suspense } from "react";
import { AdminLoadingSkeleton } from "../../components/AdminLoadingSkeleton";
import { PostsSubTab } from "../../components/blog/PostsSubTab";

export default function AdminContentPostsPage() {
  return <Suspense fallback={<AdminLoadingSkeleton variant="table" />}><PostsSubTab /></Suspense>;
}
