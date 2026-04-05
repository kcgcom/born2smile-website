-- =============================================
-- ai_ops_jobs
-- 운영 AI 제안 생성 잡 + 실시간 이벤트
-- =============================================

CREATE TABLE IF NOT EXISTS ai_agent_jobs (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_type             TEXT NOT NULL DEFAULT 'suggestion' CHECK (job_type IN ('suggestion')),
  target_type          TEXT NOT NULL CHECK (target_type IN ('post', 'page', 'site')),
  target_id            TEXT NOT NULL DEFAULT '',
  suggestion_type      TEXT NOT NULL CHECK (suggestion_type IN ('title', 'meta_description', 'faq', 'internal_links', 'body_revision')),
  actor_email          TEXT NOT NULL DEFAULT '',
  context              TEXT,
  payload_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  stage                TEXT NOT NULL DEFAULT 'queued' CHECK (stage IN ('queued', 'context', 'generation', 'persisting', 'completed', 'failed')),
  message              TEXT NOT NULL DEFAULT '',
  result_suggestion_id BIGINT REFERENCES ai_agent_suggestions(id) ON DELETE SET NULL,
  last_error           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_agent_jobs IS '운영 AI 제안 생성 잡 상태';
CREATE INDEX IF NOT EXISTS idx_ai_agent_jobs_status_created_at ON ai_agent_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_jobs_actor_created_at ON ai_agent_jobs (actor_email, created_at DESC);
ALTER TABLE ai_agent_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_jobs_authenticated_read" ON ai_agent_jobs;
CREATE POLICY "ai_agent_jobs_authenticated_read" ON ai_agent_jobs
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "ai_agent_jobs_server_only_write" ON ai_agent_jobs;
CREATE POLICY "ai_agent_jobs_server_only_write" ON ai_agent_jobs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TABLE IF NOT EXISTS ai_agent_job_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id      BIGINT NOT NULL REFERENCES ai_agent_jobs(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  stage       TEXT NOT NULL CHECK (stage IN ('queued', 'context', 'generation', 'persisting', 'completed', 'failed')),
  message     TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_agent_job_events IS '운영 AI 제안 생성 잡 진행 이벤트';
CREATE INDEX IF NOT EXISTS idx_ai_agent_job_events_job_created_at ON ai_agent_job_events (job_id, created_at ASC);
ALTER TABLE ai_agent_job_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_job_events_authenticated_read" ON ai_agent_job_events;
CREATE POLICY "ai_agent_job_events_authenticated_read" ON ai_agent_job_events
  FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "ai_agent_job_events_server_only_write" ON ai_agent_job_events;
CREATE POLICY "ai_agent_job_events_server_only_write" ON ai_agent_job_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_agent_jobs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_agent_job_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
