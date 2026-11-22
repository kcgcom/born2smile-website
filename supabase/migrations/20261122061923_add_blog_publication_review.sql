alter table public.blog_posts
  add column if not exists publication_review_requested_at timestamptz;
