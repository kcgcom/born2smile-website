"use client";

import dynamic from "next/dynamic";

const LikeButton = dynamic(() => import("./LikeButton"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex h-11 w-28 animate-pulse rounded-full bg-[var(--surface)]" />
  ),
});

export default function LikeButtonLazy({
  slug,
  source,
  size,
  className,
}: {
  slug: string;
  source?: string;
  size?: "default" | "compact";
  className?: string;
}) {
  return <LikeButton slug={slug} source={source} size={size} className={className} />;
}
