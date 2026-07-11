create table if not exists public.content_planner_items (
  id uuid primary key default gen_random_uuid(),
  opportunity_key text not null unique,
  item_type text not null check (item_type in ('blog', 'page')),
  title text not null,
  category text not null,
  target_page text not null,
  status text not null default 'approved'
    check (status in ('approved', 'in_progress', 'review', 'scheduled', 'published', 'deferred', 'dismissed')),
  priority text not null default 'now'
    check (priority in ('now', 'next', 'watch')),
  rationale text not null default '',
  brief jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  due_date date,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_planner_items_status_idx
  on public.content_planner_items (status, updated_at desc);

alter table public.content_planner_items enable row level security;

comment on table public.content_planner_items is
  '관리자가 승인, 보류, 제외한 콘텐츠 기회와 실행 상태. service_role 전용.';
