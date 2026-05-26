/**
 * URL 공유 유틸리티
 * Web Share API 우선 사용, 미지원 시 클립보드 복사로 폴백
 */
export interface ShareTrackingOptions {
  slug?: string;
  source?: string;
}

export interface ShareVisitAttribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  shareSource: string | null;
}

export function buildTrackedShareUrl(
  url: string,
  options: ShareTrackingOptions = {},
): string {
  try {
    const nextUrl = new URL(url);

    nextUrl.searchParams.set("utm_source", "website");
    nextUrl.searchParams.set("utm_medium", "blog_share");

    if (options.slug) {
      nextUrl.searchParams.set("utm_campaign", `blog_${options.slug}`);
    }

    if (options.source) {
      nextUrl.searchParams.set("share_source", options.source);
    }

    return nextUrl.toString();
  } catch {
    return url;
  }
}

export function getShareVisitAttribution(
  searchParams: URLSearchParams,
): ShareVisitAttribution | null {
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");
  const shareSource = searchParams.get("share_source");

  const isTrackedShare =
    utmSource === "website" &&
    utmMedium === "blog_share";

  if (!isTrackedShare && !shareSource) return null;

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    shareSource,
  };
}

export async function shareUrl(
  url: string,
  title: string
): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      return "failed";
    }
  }

  if (typeof navigator === "undefined") return "failed";

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
