"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getShareVisitAttribution } from "@/lib/share";
import { captureEvent } from "@/lib/posthog";
import type { BlogCategoryValue } from "@/lib/blog/types";

interface BlogShareVisitTrackerProps {
  slug: string;
  category: BlogCategoryValue;
}

const STORAGE_KEY_PREFIX = "born2smile-share-visit";

export default function BlogShareVisitTracker({
  slug,
  category,
}: BlogShareVisitTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const attribution = getShareVisitAttribution(searchParams);
    if (!attribution) return;

    const key = [
      STORAGE_KEY_PREFIX,
      pathname,
      attribution.utmCampaign ?? "none",
      attribution.shareSource ?? "none",
    ].join(":");

    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {}

    captureEvent("blog_share_visit", {
      blog_slug: slug,
      category,
      share_source: attribution.shareSource,
      utm_source: attribution.utmSource,
      utm_medium: attribution.utmMedium,
      utm_campaign: attribution.utmCampaign,
    });
  }, [category, pathname, searchParams, slug]);

  return null;
}
