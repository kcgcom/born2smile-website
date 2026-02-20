"use client";

import dynamic from "next/dynamic";

const LikeButton = dynamic(() => import("./LikeButton"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex h-9 w-20 animate-pulse rounded-full bg-gray-100" />
  ),
});

export default function LikeButtonLazy({ slug }: { slug: string }) {
  return <LikeButton slug={slug} />;
}
