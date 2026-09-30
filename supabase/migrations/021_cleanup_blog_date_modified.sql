-- 공개 콘텐츠 변경이 아닌 2026-03-25 본문 포맷 마이그레이션 날짜를 제거한다.
-- 발행일과 같거나 더 이른 수정일도 SEO 메타데이터의 시간 순서를 어기므로 제거한다.
UPDATE blog_posts
SET date_modified = NULL
WHERE date_modified <= date
   OR (
     date_modified = '2026-03-25'
     AND updated_by = 'migration-script'
   );
