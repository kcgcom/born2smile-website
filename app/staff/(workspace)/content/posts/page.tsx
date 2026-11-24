import { Suspense } from "react";
import { AdminLoadingSkeleton } from "@/app/admin/(dashboard)/components/AdminLoadingSkeleton";
import { PostsSubTab } from "@/app/admin/(dashboard)/components/blog/PostsSubTab";
import { StaffRevisionList } from "@/app/admin/(dashboard)/components/blog/StaffRevisionList";

export default function StaffPostsPage() {
  return (
    <div className="space-y-4">
      <StaffRevisionList />
      <Suspense fallback={<AdminLoadingSkeleton variant="table" />}>
        <PostsSubTab />
      </Suspense>
    </div>
  );
}
