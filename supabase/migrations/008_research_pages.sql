-- research_pages: 연구 자료 페이지 데이터 (slug별 JSONB 저장)
CREATE TABLE IF NOT EXISTS research_pages (
  slug        TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 관리자(service_role)만 쓰기, 공개 읽기
ALTER TABLE research_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read research_pages"
  ON research_pages FOR SELECT
  USING (true);

CREATE POLICY "service role write research_pages"
  ON research_pages FOR ALL
  USING (auth.role() = 'service_role');
