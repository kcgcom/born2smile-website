-- =============================================
-- drop_ai_ops
-- AI 운영실 기능 제거 — 관련 테이블 전체 삭제
-- =============================================

-- Realtime publication 해제 (존재하지 않아도 무시)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE ai_agent_job_events;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE ai_agent_jobs;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- FK 의존 순서대로 삭제
DROP TABLE IF EXISTS ai_agent_job_events CASCADE;
DROP TABLE IF EXISTS ai_agent_jobs CASCADE;
DROP TABLE IF EXISTS ai_agent_outcomes CASCADE;
DROP TABLE IF EXISTS ai_agent_actions CASCADE;
DROP TABLE IF EXISTS ai_agent_suggestions CASCADE;
DROP TABLE IF EXISTS ai_agent_briefings CASCADE;
DROP TABLE IF EXISTS agent_jobs CASCADE;
