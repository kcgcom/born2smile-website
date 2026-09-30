-- 실제 검수 워크플로우 없이 부분적으로 남아 있던 블로그 검수일 필드를 제거한다.
ALTER TABLE blog_posts
DROP COLUMN IF EXISTS reviewed_date;
