-- =============================================
-- ai_ops
-- 운영 AI 에이전트 브리핑/제안/액션/잡 기록
-- =============================================

CREATE TABLE IF NOT EXISTS ai_agent_briefings (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  period_type              TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  headline                 TEXT NOT NULL DEFAULT '',
  summary                  TEXT NOT NULL DEFAULT '',
  metrics_json             JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_agent_briefings IS '운영 AI 브리핑 스냅샷';
CREATE INDEX IF NOT EXISTS idx_ai_agent_briefings_period_created_at ON ai_agent_briefings (period_type, created_at DESC);
ALTER TABLE ai_agent_briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_briefings_server_only" ON ai_agent_briefings;
CREATE POLICY "ai_agent_briefings_server_only" ON ai_agent_briefings FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS ai_agent_suggestions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type     TEXT NOT NULL CHECK (target_type IN ('post', 'page', 'site')),
  target_id       TEXT NOT NULL DEFAULT '',
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('title', 'meta_description', 'faq', 'internal_links', 'body_revision')),
  title           TEXT NOT NULL DEFAULT '',
  before_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason          TEXT NOT NULL DEFAULT '',
  priority_score  INTEGER NOT NULL DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'applied')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT NOT NULL DEFAULT '',
  approved_at     TIMESTAMPTZ,
  approved_by     TEXT,
  applied_at      TIMESTAMPTZ,
  applied_by      TEXT
);

COMMENT ON TABLE ai_agent_suggestions IS '운영 AI 수정 제안';
CREATE INDEX IF NOT EXISTS idx_ai_agent_suggestions_status_created_at ON ai_agent_suggestions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_suggestions_target ON ai_agent_suggestions (target_type, target_id, created_at DESC);
ALTER TABLE ai_agent_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_suggestions_server_only" ON ai_agent_suggestions;
CREATE POLICY "ai_agent_suggestions_server_only" ON ai_agent_suggestions FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS ai_agent_actions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  suggestion_id BIGINT NOT NULL REFERENCES ai_agent_suggestions(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'apply', 'rollback')),
  actor_email   TEXT NOT NULL DEFAULT '',
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_agent_actions IS '운영 AI 승인/반려/적용 감사 로그';
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_suggestion_created_at ON ai_agent_actions (suggestion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_created_at ON ai_agent_actions (created_at DESC);
ALTER TABLE ai_agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_actions_server_only" ON ai_agent_actions;
CREATE POLICY "ai_agent_actions_server_only" ON ai_agent_actions FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_type      TEXT NOT NULL DEFAULT '',
  payload_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status        TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error    TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_jobs IS '운영 AI 잡 큐 상태';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status_scheduled_at ON agent_jobs (status, scheduled_at ASC);
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_jobs_server_only" ON agent_jobs;
CREATE POLICY "agent_jobs_server_only" ON agent_jobs FOR ALL USING (false);
