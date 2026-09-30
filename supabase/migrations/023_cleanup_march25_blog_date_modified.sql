-- Supabase/snapshot 전환과 BlogBlock 일괄 변환 과정에서 기록된 작업일이다.
-- 사용자에게 보이는 콘텐츠의 실제 수정일이 아니므로 제거한다.
UPDATE blog_posts
SET date_modified = NULL
WHERE date_modified = '2026-03-25';
