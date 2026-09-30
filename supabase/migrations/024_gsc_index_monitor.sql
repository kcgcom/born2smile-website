create table if not exists public.gsc_index_status (
  url text primary key,
  path text not null,
  status text not null default 'unchecked'
    check (status in ('unchecked', 'indexed', 'discovered', 'crawled-not-indexed', 'unknown', 'excluded', 'failed')),
  verdict text,
  coverage_state text,
  robots_txt_state text,
  indexing_state text,
  page_fetch_state text,
  last_crawl_time timestamptz,
  user_canonical text,
  google_canonical text,
  canonical_mismatch boolean not null default false,
  confirmed_signature text,
  confirmed_status text
    check (confirmed_status is null or confirmed_status in ('unchecked', 'indexed', 'discovered', 'crawled-not-indexed', 'unknown', 'excluded', 'failed')),
  pending_signature text,
  pending_count integer not null default 0 check (pending_count >= 0),
  inspected_at timestamptz,
  last_changed_at timestamptz,
  last_seen_in_sitemap_at timestamptz not null default now(),
  next_inspect_at timestamptz not null default now(),
  error_message text
);

create index if not exists gsc_index_status_inspected_at_idx
  on public.gsc_index_status (inspected_at asc nulls first);

create index if not exists gsc_index_status_attention_idx
  on public.gsc_index_status (status, canonical_mismatch);

create index if not exists gsc_index_status_next_inspect_at_idx
  on public.gsc_index_status (next_inspect_at asc);

create table if not exists public.gsc_index_events (
  id bigint generated always as identity primary key,
  url text not null references public.gsc_index_status(url) on delete cascade,
  from_status text,
  to_status text not null,
  observed_at timestamptz not null default now()
);

create index if not exists gsc_index_events_observed_at_idx
  on public.gsc_index_events (observed_at desc);

create table if not exists public.gsc_index_monitor_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running'
    check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  batch_size integer not null default 50,
  processed_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists gsc_index_monitor_one_active_idx
  on public.gsc_index_monitor_runs ((true)) where status = 'running';

alter table public.gsc_index_status enable row level security;
alter table public.gsc_index_events enable row level security;
alter table public.gsc_index_monitor_runs enable row level security;

comment on table public.gsc_index_status is 'Search Console URL Inspection 최신 상태. service_role 전용.';
comment on table public.gsc_index_events is '두 번 연속 확인된 색인 상태 변경 이력. service_role 전용.';
comment on table public.gsc_index_monitor_runs is '색인 상태 순환 검사 작업 기록. service_role 전용.';
