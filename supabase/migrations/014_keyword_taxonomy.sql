create table if not exists public.keyword_taxonomy_versions (
  id uuid primary key default gen_random_uuid(),
  version integer generated always as identity unique,
  status text not null default 'active' check (status in ('active', 'archived')),
  taxonomy jsonb not null,
  change_summary text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz not null default now()
);

create unique index if not exists keyword_taxonomy_one_active_idx
  on public.keyword_taxonomy_versions ((true)) where status = 'active';

create table if not exists public.keyword_taxonomy_candidates (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null,
  monthly_volume integer not null default 0,
  suggested_category text not null,
  suggested_subgroup text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'deferred', 'rejected')),
  reason text not null default '',
  source_snapshot_id uuid references public.searchad_snapshots(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_keyword, suggested_category)
);

create index if not exists keyword_taxonomy_candidates_status_idx
  on public.keyword_taxonomy_candidates (status, monthly_volume desc);

alter table public.keyword_taxonomy_versions enable row level security;
alter table public.keyword_taxonomy_candidates enable row level security;

create or replace function public.activate_keyword_taxonomy(
  p_taxonomy jsonb,
  p_created_by text,
  p_change_summary text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  update public.keyword_taxonomy_versions
    set status = 'archived'
    where status = 'active';

  insert into public.keyword_taxonomy_versions (
    status, taxonomy, change_summary, created_by
  ) values (
    'active', p_taxonomy, p_change_summary, p_created_by
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.activate_keyword_taxonomy(jsonb, text, text) from public;
grant execute on function public.activate_keyword_taxonomy(jsonb, text, text) to service_role;

comment on table public.keyword_taxonomy_versions is
  '관리자가 활성화한 전체 키워드 택소노미 버전. service_role 전용.';
comment on table public.keyword_taxonomy_candidates is
  'SearchAd 스냅샷에서 발견한 핵심 키워드 추가 검토 후보. service_role 전용.';
