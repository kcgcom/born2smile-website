-- research_pages 검증 상태 컬럼 추가
-- 기본값 false: 관리자가 검증 완료 처리해야 공개됨

ALTER TABLE research_pages
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
