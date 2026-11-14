-- 질문 해결 피드백: 브라우저 직접 쓰기를 허용하지 않고 검증된 서버 API만 사용한다.
BEGIN;
CREATE TABLE public.blog_question_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL REFERENCES public.blog_posts(slug) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
  answer TEXT NOT NULL CHECK (answer IN ('solved', 'unresolved')),
  reason TEXT CHECK (reason IN ('missing', 'difficult', 'not_applicable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, visitor_hash),
  CHECK (answer = 'unresolved' OR reason IS NULL)
);
ALTER TABLE public.blog_question_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_question_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.blog_question_feedback TO service_role;

CREATE FUNCTION public.set_question_feedback_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER question_feedback_updated_at BEFORE UPDATE ON public.blog_question_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_question_feedback_updated_at();

CREATE FUNCTION public.get_blog_question_feedback_stats()
RETURNS TABLE (slug TEXT, solved BIGINT, unresolved BIGINT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT slug, count(*) FILTER (WHERE answer = 'solved'), count(*) FILTER (WHERE answer = 'unresolved')
  FROM public.blog_question_feedback GROUP BY slug;
$$;
REVOKE ALL ON FUNCTION public.get_blog_question_feedback_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blog_question_feedback_stats() TO service_role;

-- 구 클라이언트가 남아 있어도 폐기한 좋아요를 다시 생성하지 않는다.
REVOKE EXECUTE ON FUNCTION public.toggle_like(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
DELETE FROM public.blog_likes;
COMMENT ON TABLE public.blog_question_feedback IS '익명 방문자의 글별 최종 질문 해결 응답; 관리자 응답은 서버에서 제외';
COMMIT;
