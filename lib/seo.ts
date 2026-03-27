// SEO 메타 설명 유틸리티

const META_DESCRIPTION_MIN = 150;
const META_DESCRIPTION_MAX = 160;

/**
 * 메타 설명을 150~160자 범위로 맞춤.
 * - 160자 초과: 말줄임표로 자름
 * - 150~160자: 그대로 반환
 * - 150자 미만: pad 문장 추가 후 재조정 (pad 없으면 그대로)
 */
export function fitMetaDescription(base: string, pad?: string): string {
  const normalized = base.replace(/\s+/g, " ").trim();

  if (normalized.length > META_DESCRIPTION_MAX) {
    return `${normalized.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  if (normalized.length >= META_DESCRIPTION_MIN) {
    return normalized;
  }

  if (!pad) return normalized;

  const expanded = `${normalized} ${pad}`;

  if (expanded.length > META_DESCRIPTION_MAX) {
    return `${expanded.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`;
  }

  return expanded;
}
