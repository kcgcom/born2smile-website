-- Separate unpublished revision proposals from the current blog row.
-- Write this migration to Git separately from applying it to the operational DB.
BEGIN;
ALTER TABLE public.blog_posts ADD COLUMN revision UUID NOT NULL DEFAULT gen_random_uuid();

CREATE FUNCTION public.rotate_blog_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.revision := gen_random_uuid();
  RETURN NEW;
END;
$$;
CREATE TRIGGER rotate_blog_revision BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.rotate_blog_revision();

CREATE TABLE public.blog_content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  base_revision UUID NOT NULL,
  original JSONB NOT NULL CHECK (jsonb_typeof(original) = 'object'),
  candidate JSONB NOT NULL CHECK (jsonb_typeof(candidate) = 'object'),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT,
  applied_at TIMESTAMPTZ,
  applied_revision UUID
);
CREATE INDEX blog_content_revisions_slug_created ON public.blog_content_revisions(slug, created_at DESC);
ALTER TABLE public.blog_content_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blog_content_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.blog_content_revisions TO service_role;

CREATE FUNCTION public.create_blog_content_revision(p_slug TEXT, p_base_revision UUID, p_candidate JSONB, p_reason TEXT, p_actor TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_post public.blog_posts%ROWTYPE; result public.blog_content_revisions%ROWTYPE;
BEGIN
  SELECT * INTO current_post FROM public.blog_posts WHERE slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF current_post.revision <> p_base_revision THEN RETURN jsonb_build_object('status', 'conflict'); END IF;
  INSERT INTO public.blog_content_revisions(slug, base_revision, original, candidate, reason, created_by)
  VALUES (p_slug, p_base_revision,
    jsonb_build_object('title', current_post.title, 'subtitle', current_post.subtitle, 'excerpt', current_post.excerpt,
      'category', current_post.category, 'tags', current_post.tags, 'blocks', current_post.content),
    p_candidate, p_reason, p_actor) RETURNING * INTO result;
  RETURN jsonb_build_object('status', 'created', 'id', result.id);
END;
$$;

CREATE FUNCTION public.apply_blog_content_revision(p_id UUID, p_actor TEXT, p_read_time TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE proposal public.blog_content_revisions%ROWTYPE; current_post public.blog_posts%ROWTYPE;
  next_revision UUID; today_kst TEXT := to_char(clock_timestamp() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD');
BEGIN
  SELECT * INTO proposal FROM public.blog_content_revisions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF proposal.status <> 'draft' THEN RETURN jsonb_build_object('status', 'already_applied'); END IF;
  SELECT * INTO current_post FROM public.blog_posts WHERE slug = proposal.slug FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF current_post.revision <> proposal.base_revision THEN RETURN jsonb_build_object('status', 'conflict'); END IF;
  UPDATE public.blog_posts SET
    title = proposal.candidate->>'title', subtitle = proposal.candidate->>'subtitle', excerpt = proposal.candidate->>'excerpt',
    category = proposal.candidate->>'category', tags = ARRAY(SELECT jsonb_array_elements_text(proposal.candidate->'tags')),
    content = proposal.candidate->'blocks', read_time = p_read_time,
    date_modified = CASE WHEN current_post.published AND current_post.date <= today_kst
      THEN CASE WHEN current_post.date < today_kst THEN today_kst ELSE NULL END ELSE current_post.date_modified END,
    updated_at = clock_timestamp(), updated_by = p_actor
  WHERE slug = proposal.slug RETURNING revision INTO next_revision;
  -- The same transaction records application; any failure rolls back both writes.
  UPDATE public.blog_content_revisions SET status = 'applied', applied_by = p_actor,
    applied_at = clock_timestamp(), applied_revision = next_revision WHERE id = p_id;
  RETURN jsonb_build_object('status', 'applied', 'slug', proposal.slug, 'revision', next_revision,
    'category', proposal.candidate->>'category', 'previousCategory', current_post.category, 'published', current_post.published, 'date', current_post.date);
END;
$$;
REVOKE ALL ON FUNCTION public.create_blog_content_revision(TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_blog_content_revision(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_blog_content_revision(TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_blog_content_revision(UUID, TEXT, TEXT) TO service_role;
COMMIT;
