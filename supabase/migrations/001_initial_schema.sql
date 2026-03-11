-- =============================================
-- Born2Smile: Firestore → Supabase 마이그레이션
-- Phase 1: 스키마, 인덱스, RLS, RPC 함수
-- =============================================

-- =============================================
-- 1. blog_posts
-- Firestore: blog-posts 컬렉션 (문서 ID = slug)
-- =============================================
CREATE TABLE blog_posts (
  slug          TEXT PRIMARY KEY
                CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$'),
  title         TEXT NOT NULL,
  subtitle      TEXT NOT NULL DEFAULT '',
  excerpt       TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  date          TEXT NOT NULL,                     -- 'YYYY-MM-DD' 문자열 (기존 호환)
  date_modified TEXT,                              -- 'YYYY-MM-DD' | null
  content       JSONB NOT NULL DEFAULT '[]'::jsonb, -- {heading, content}[]
  read_time     TEXT NOT NULL DEFAULT '1분',
  reviewed_date TEXT,                              -- 'YYYY-MM-DD' | null
  published     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE blog_posts IS '블로그 포스트 (Firestore blog-posts 컬렉션 대체)';
COMMENT ON COLUMN blog_posts.content IS 'Array of {heading: string, content: string}';
COMMENT ON COLUMN blog_posts.category IS '예방관리|보존치료|보철치료|임플란트|치아교정|소아치료|건강상식';

-- 인덱스: Firestore 복합 인덱스 3개 대체
CREATE INDEX idx_blog_posts_published_date
  ON blog_posts (date DESC) WHERE published = true;

CREATE INDEX idx_blog_posts_category_date
  ON blog_posts (category, date DESC);

CREATE INDEX idx_blog_posts_published_category_date
  ON blog_posts (category, date DESC) WHERE published = true;

-- =============================================
-- 2. blog_likes
-- Firestore: blog-likes 컬렉션
-- 클라이언트에서 직접 읽기/쓰기 (RPC 함수 경유)
-- =============================================
CREATE TABLE blog_likes (
  slug   TEXT PRIMARY KEY
         CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$'),
  count  INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  users  TEXT[] NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE blog_likes IS '블로그 좋아요 (Firestore blog-likes 컬렉션 대체)';

-- =============================================
-- 3. site_config
-- Firestore: site-config 컬렉션 (4개 고정 문서)
-- =============================================
CREATE TABLE site_config (
  type        TEXT PRIMARY KEY
              CHECK (type IN ('links', 'clinic', 'hours', 'schedule')),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT NOT NULL DEFAULT ''
);

COMMENT ON TABLE site_config IS '사이트 설정 (Firestore site-config 컬렉션 대체)';

-- 기본 행 삽입 (Firestore 문서가 없을 때의 기본값과 동일)
INSERT INTO site_config (type) VALUES ('links'), ('clinic'), ('hours'), ('schedule')
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. api_cache
-- Firestore: api-cache 컬렉션 (PSI L2 캐시 등)
-- =============================================
CREATE TABLE api_cache (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE api_cache IS 'API 응답 캐시 (Firestore api-cache 컬렉션 대체)';

CREATE INDEX idx_api_cache_key_prefix
  ON api_cache (key text_pattern_ops);

-- =============================================
-- 5. RLS 정책
-- =============================================

-- blog_posts: 서버 전용 (service_role만 접근)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_server_only" ON blog_posts
  FOR ALL USING (false);

-- blog_likes: SELECT는 누구나, INSERT/UPDATE는 RPC 함수(SECURITY DEFINER)로만
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_likes_select" ON blog_likes
  FOR SELECT USING (true);

-- site_config: 서버 전용
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_config_server_only" ON site_config
  FOR ALL USING (false);

-- api_cache: 서버 전용
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_cache_server_only" ON api_cache
  FOR ALL USING (false);

-- =============================================
-- 6. toggle_like RPC 함수
-- Firestore runTransaction 대체 (원자적 좋아요 토글)
-- SECURITY DEFINER: RLS 우회하여 blog_likes 직접 수정
-- =============================================
CREATE OR REPLACE FUNCTION toggle_like(p_slug TEXT, p_user_id TEXT)
RETURNS TABLE(new_count INTEGER, is_liked BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_users TEXT[];
  v_new_users TEXT[];
  v_count INTEGER;
BEGIN
  -- slug 형식 검증
  IF p_slug !~ '^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid slug format';
  END IF;

  -- user_id 검증 (UUID 형식)
  IF p_user_id IS NULL OR length(p_user_id) < 1 THEN
    RAISE EXCEPTION 'Invalid user_id';
  END IF;

  -- UPSERT: 문서가 없으면 생성
  INSERT INTO blog_likes (slug, count, users)
  VALUES (p_slug, 0, '{}')
  ON CONFLICT (slug) DO NOTHING;

  -- 행 잠금 후 현재 상태 읽기
  SELECT users INTO v_users
  FROM blog_likes WHERE slug = p_slug FOR UPDATE;

  IF p_user_id = ANY(v_users) THEN
    -- 좋아요 취소
    v_new_users := array_remove(v_users, p_user_id);
    v_count := COALESCE(array_length(v_new_users, 1), 0);

    UPDATE blog_likes
    SET users = v_new_users, count = v_count
    WHERE slug = p_slug;

    RETURN QUERY SELECT v_count, false;
  ELSE
    -- 좋아요 추가 (최대 10000명)
    IF COALESCE(array_length(v_users, 1), 0) >= 10000 THEN
      RAISE EXCEPTION 'Maximum likes reached';
    END IF;

    v_new_users := array_append(v_users, p_user_id);
    v_count := array_length(v_new_users, 1);

    UPDATE blog_likes
    SET users = v_new_users, count = v_count
    WHERE slug = p_slug;

    RETURN QUERY SELECT v_count, true;
  END IF;
END;
$$;

-- anon/authenticated 역할에서 RPC 호출 허용
GRANT EXECUTE ON FUNCTION toggle_like(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION toggle_like(TEXT, TEXT) TO authenticated;

-- =============================================
-- 7. get_like RPC 함수
-- 클라이언트에서 단일 포스트 좋아요 조회
-- =============================================
CREATE OR REPLACE FUNCTION get_like(p_slug TEXT)
RETURNS TABLE(like_count INTEGER, like_users TEXT[])
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT count, users
  FROM blog_likes
  WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION get_like(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_like(TEXT) TO authenticated;
