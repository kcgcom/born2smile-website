-- =============================================
-- ai_ops_low_traffic
-- 저트래픽 운영실용 메타데이터/관측 결과 확장
-- =============================================

ALTER TABLE ai_agent_suggestions
  ADD COLUMN IF NOT EXISTS playbook_id TEXT,
  ADD COLUMN IF NOT EXISTS apply_mode TEXT NOT NULL DEFAULT 'auto' CHECK (apply_mode IN ('auto', 'manual')),
  ADD COLUMN IF NOT EXISTS evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observation_plan_json JSONB;

CREATE TABLE IF NOT EXISTS ai_agent_outcomes (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  suggestion_id    BIGINT NOT NULL REFERENCES ai_agent_suggestions(id) ON DELETE CASCADE,
  window_days      INTEGER NOT NULL CHECK (window_days IN (14, 30, 60)),
  target_type      TEXT NOT NULL CHECK (target_type IN ('post', 'page', 'site')),
  target_id        TEXT NOT NULL DEFAULT '',
  verdict          TEXT NOT NULL CHECK (verdict IN ('strong_positive', 'weak_positive', 'inconclusive', 'weak_negative', 'strong_negative')),
  summary          TEXT NOT NULL DEFAULT '',
  confidence_note  TEXT NOT NULL DEFAULT '',
  baseline_json    JSONB,
  observed_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
  measured_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, window_days)
);

COMMENT ON TABLE ai_agent_outcomes IS '저트래픽 운영실용 관측 신호 기록';
CREATE INDEX IF NOT EXISTS idx_ai_agent_outcomes_measured_at ON ai_agent_outcomes (measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_outcomes_target ON ai_agent_outcomes (target_type, target_id, measured_at DESC);
ALTER TABLE ai_agent_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_agent_outcomes_server_only" ON ai_agent_outcomes;
CREATE POLICY "ai_agent_outcomes_server_only" ON ai_agent_outcomes FOR ALL USING (false);
