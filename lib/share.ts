/**
 * URL 공유 유틸리티
 * Web Share API 우선 사용, 미지원 시 클립보드 복사로 폴백
 */
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
