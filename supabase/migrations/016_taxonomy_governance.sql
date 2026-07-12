alter table public.keyword_taxonomy_candidates
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists seen_count integer not null default 1;

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
    set status = 'archived'
    where status = 'pending';

  insert into public.keyword_taxonomy_versions (
    status, taxonomy, change_summary, created_by
  ) values (
    'pending', p_taxonomy, p_change_summary, p_created_by
  ) returning version into pending_version;

  update public.keyword_taxonomy_candidates
    set status = 'approved',
        reviewed_by = p_created_by,
        reviewed_at = now(),
        updated_at = now()
    where id = any(p_candidate_ids);

  return pending_version;
end;
$$;

create or replace function public.discard_pending_keyword_taxonomy()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  discarded_version integer;
begin
  update public.keyword_taxonomy_versions
    set status = 'archived'
    where status = 'pending'
    returning version into discarded_version;
  return discarded_version;
end;
$$;

create or replace function public.refresh_keyword_taxonomy_candidates(
  p_candidates jsonb,
  p_snapshot_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  insert into public.keyword_taxonomy_candidates (
    keyword, normalized_keyword, monthly_volume,
    suggested_category, suggested_subgroup, reason,
    source_snapshot_id, first_seen_at, last_seen_at, seen_count
  )
  select
    candidate.keyword,
    candidate.normalized_keyword,
    candidate.monthly_volume,
    candidate.suggested_category,
    candidate.suggested_subgroup,
    candidate.reason,
    p_snapshot_id,
    now(),
    now(),
    1
  from jsonb_to_recordset(p_candidates) as candidate(
    keyword text,
    normalized_keyword text,
    monthly_volume integer,
    suggested_category text,
    suggested_subgroup text,
    reason text
  )
  on conflict (normalized_keyword, suggested_category) do update
    set monthly_volume = excluded.monthly_volume,
        suggested_subgroup = excluded.suggested_subgroup,
        reason = excluded.reason,
        last_seen_at = case
          when keyword_taxonomy_candidates.source_snapshot_id is distinct from excluded.source_snapshot_id then now()
          else keyword_taxonomy_candidates.last_seen_at
        end,
        seen_count = keyword_taxonomy_candidates.seen_count + case
          when keyword_taxonomy_candidates.source_snapshot_id is distinct from excluded.source_snapshot_id then 1
          else 0
        end,
        source_snapshot_id = excluded.source_snapshot_id,
        updated_at = now()
    where keyword_taxonomy_candidates.status = 'pending';

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.discard_pending_keyword_taxonomy() from public;
grant execute on function public.discard_pending_keyword_taxonomy() to service_role;
revoke all on function public.refresh_keyword_taxonomy_candidates(jsonb, uuid) from public;
grant execute on function public.refresh_keyword_taxonomy_candidates(jsonb, uuid) to service_role;
