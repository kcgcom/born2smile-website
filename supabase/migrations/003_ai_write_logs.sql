-- =============================================
-- ai_write_logs
-- 관리자 AI 작성 요청 운영 로그
-- =============================================

CREATE TABLE IF NOT EXISTS ai_write_logs (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  user_email    TEXT NOT NULL DEFAULT '',
  mode          TEXT NOT NULL CHECK (mode IN ('chat', 'generate')),
  model         TEXT NOT NULL DEFAULT '',
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  input_chars   INTEGER NOT NULL DEFAULT 0 CHECK (input_chars >= 0),
  output_bytes  INTEGER NOT NULL DEFAULT 0 CHECK (output_bytes >= 0),
  duration_ms   INTEGER CHECK (duration_ms >= 0),
  success       BOOLEAN NOT NULL DEFAULT false,
  error_code    TEXT,
  error_message TEXT
);

COMMENT ON TABLE ai_write_logs IS '관리자 AI 작성 요청 로그';

CREATE INDEX IF NOT EXISTS idx_ai_write_logs_requested_at
  ON ai_write_logs (requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_write_logs_user_email_requested_at
  ON ai_write_logs (user_email, requested_at DESC);

ALTER TABLE ai_write_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_write_logs_server_only" ON ai_write_logs;
CREATE POLICY "ai_write_logs_server_only" ON ai_write_logs
  FOR ALL USING (false);
