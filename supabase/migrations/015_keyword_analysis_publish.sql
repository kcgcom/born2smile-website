alter table public.keyword_taxonomy_versions
  drop constraint if exists keyword_taxonomy_versions_status_check;
alter table public.keyword_taxonomy_versions
  add constraint keyword_taxonomy_versions_status_check
  check (status in ('pending', 'active', 'archived'));

create unique index if not exists keyword_taxonomy_one_pending_idx
  on public.keyword_taxonomy_versions ((true)) where status = 'pending';

alter table public.searchad_sync_jobs
  add column if not exists taxonomy_version integer;
alter table public.searchad_snapshots
  add column if not exists taxonomy_version integer;

update public.searchad_snapshots
  set taxonomy_version = (select version from public.keyword_taxonomy_versions where status = 'active' limit 1)
  where taxonomy_version is null;
update public.searchad_sync_jobs
  set taxonomy_version = (select version from public.keyword_taxonomy_versions where status = 'active' limit 1)
  where taxonomy_version is null;

create table if not exists public.datalab_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.searchad_sync_jobs(id) on delete cascade,
  taxonomy_version integer not null,
  short_term_data jsonb not null,
  long_term_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.datalab_snapshot_pointer (
  singleton boolean primary key default true check (singleton),
  snapshot_id uuid not null references public.datalab_snapshots(id),
  updated_at timestamptz not null default now()
);

alter table public.datalab_snapshots enable row level security;
alter table public.datalab_snapshot_pointer enable row level security;

create or replace function public.save_pending_keyword_taxonomy(
  p_taxonomy jsonb,
  p_created_by text,
  p_change_summary text,
  p_candidate_ids uuid[]
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_version integer;
begin
  update public.keyword_taxonomy_versions
    set taxonomy = p_taxonomy,
        change_summary = p_change_summary,
        created_by = p_created_by,
        created_at = now(),
        activated_at = now()
    where status = 'pending'
    returning version into pending_version;

  if pending_version is null then
    insert into public.keyword_taxonomy_versions (
      status, taxonomy, change_summary, created_by
    ) values (
      'pending', p_taxonomy, p_change_summary, p_created_by
    ) returning version into pending_version;
  end if;

  update public.keyword_taxonomy_candidates
    set status = 'approved',
        reviewed_by = p_created_by,
        reviewed_at = now(),
        updated_at = now()
    where id = any(p_candidate_ids);

  return pending_version;
end;
$$;

create or replace function public.publish_keyword_analysis(
  p_taxonomy_version integer,
  p_searchad_snapshot_id uuid,
  p_datalab_snapshot_id uuid,
  p_job_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.keyword_taxonomy_versions
    where version = p_taxonomy_version and status in ('pending', 'active')
  ) then
    raise exception '게시할 택소노미 버전을 찾을 수 없습니다: %', p_taxonomy_version;
  end if;

  update public.keyword_taxonomy_versions
    set status = 'archived'
    where status = 'active' and version <> p_taxonomy_version;

  update public.keyword_taxonomy_versions
    set status = 'active', activated_at = now()
    where version = p_taxonomy_version;

  insert into public.searchad_snapshot_pointer (singleton, snapshot_id, updated_at)
    values (true, p_searchad_snapshot_id, now())
    on conflict (singleton) do update
      set snapshot_id = excluded.snapshot_id, updated_at = excluded.updated_at;

  insert into public.datalab_snapshot_pointer (singleton, snapshot_id, updated_at)
    values (true, p_datalab_snapshot_id, now())
    on conflict (singleton) do update
      set snapshot_id = excluded.snapshot_id, updated_at = excluded.updated_at;

  update public.searchad_sync_jobs
    set status = 'completed', completed_at = now(), processed_keywords = total_keywords
    where id = p_job_id;
end;
$$;

revoke all on function public.save_pending_keyword_taxonomy(jsonb, text, text, uuid[]) from public;
grant execute on function public.save_pending_keyword_taxonomy(jsonb, text, text, uuid[]) to service_role;
revoke all on function public.publish_keyword_analysis(integer, uuid, uuid, uuid) from public;
grant execute on function public.publish_keyword_analysis(integer, uuid, uuid, uuid) to service_role;

comment on table public.datalab_snapshots is
  '택소노미 버전별 DataLab 단기·장기 원본 응답 스냅샷. service_role 전용.';
