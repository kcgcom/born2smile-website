alter table public.keyword_taxonomy_candidates
  add column if not exists approved_version integer;

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
  previous_pending_version integer;
  pending_version integer;
begin
  select version into previous_pending_version
    from public.keyword_taxonomy_versions
    where status = 'pending'
    limit 1;

  update public.keyword_taxonomy_versions
    set status = 'archived'
    where status = 'pending';

  insert into public.keyword_taxonomy_versions (
    status, taxonomy, change_summary, created_by
  ) values (
    'pending', p_taxonomy, p_change_summary, p_created_by
  ) returning version into pending_version;

  if previous_pending_version is not null then
    update public.keyword_taxonomy_candidates
      set approved_version = pending_version,
          updated_at = now()
      where approved_version = previous_pending_version
        and status = 'approved';
  end if;

  update public.keyword_taxonomy_candidates
    set status = 'approved',
        approved_version = pending_version,
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

  if discarded_version is not null then
    update public.keyword_taxonomy_candidates
      set status = 'pending',
          approved_version = null,
          reviewed_by = null,
          reviewed_at = null,
          updated_at = now()
      where approved_version = discarded_version
        and status = 'approved';
  end if;

  return discarded_version;
end;
$$;
