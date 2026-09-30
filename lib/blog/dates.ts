interface BlogPublicationDates {
  date: string;
  dateModified?: string | null;
}

/**
 * 공개 SEO 메타데이터에는 발행일보다 늦은 실제 수정일만 노출합니다.
 * 같은 날 값은 추가 정보를 주지 않고, 더 이른 값은 시간 순서가 잘못된 값입니다.
 */
export function getMeaningfulDateModified({
  date,
  dateModified,
}: BlogPublicationDates): string | undefined {
  return dateModified && dateModified > date ? dateModified : undefined;
}

export function getBlogLastModifiedDate(post: BlogPublicationDates): Date {
  return new Date(getMeaningfulDateModified(post) ?? post.date);
}
