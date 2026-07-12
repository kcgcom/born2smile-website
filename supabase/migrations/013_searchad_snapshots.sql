create table if not exists public.searchad_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  total_keywords integer not null default 0,
  processed_keywords integer not null default 0,
  error_message text,
  created_by text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists searchad_sync_jobs_one_active_idx
  on public.searchad_sync_jobs ((true))
  where status in ('queued', 'running');

create index if not exists searchad_sync_jobs_created_at_idx
  on public.searchad_sync_jobs (created_at desc);

create table if not exists public.searchad_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.searchad_sync_jobs(id) on delete cascade,
  keyword_count integer not null,
  result_count integer not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.searchad_snapshot_pointer (
  singleton boolean primary key default true check (singleton),
  snapshot_id uuid not null references public.searchad_snapshots(id),
  updated_at timestamptz not null default now()
);

alter table public.searchad_sync_jobs enable row level security;
alter table public.searchad_snapshots enable row level security;
alter table public.searchad_snapshot_pointer enable row level security;

comment on table public.searchad_sync_jobs is
  'SearchAd 전체 핵심 키워드 비동기 수집 작업 상태. service_role 전용.';
comment on table public.searchad_snapshots is
  '완료된 SearchAd 원본 결과의 불변 스냅샷. service_role 전용.';
comment on table public.searchad_snapshot_pointer is
  '현재 활성 SearchAd 스냅샷을 가리키는 단일 포인터. service_role 전용.';
