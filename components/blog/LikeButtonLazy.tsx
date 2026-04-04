"use client";

import dynamic from "next/dynamic";

const LikeButton = dynamic(() => import("./LikeButton"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex h-11 w-28 animate-pulse rounded-full bg-gray-100" />
  ),
});

export default function LikeButtonLazy({
  slug,
  source,
}: {
  slug: string;
  source?: string;
}) {
  return <LikeButton slug={slug} source={source} />;
}
