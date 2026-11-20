create table public.indexnow_submission_state (
  scope text primary key,
  latest jsonb not null,
  latest_accepted jsonb
);

alter table public.indexnow_submission_state enable row level security;
revoke all on table public.indexnow_submission_state from public, anon, authenticated, service_role;
grant select, insert, update on table public.indexnow_submission_state to service_role;

create function public.record_indexnow_submission(p_slugs text[], p_run jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into public.indexnow_submission_state as previous (scope, latest, latest_accepted)
  select scope, p_run, case when p_run->>'status' = 'accepted' then p_run end
  from (
    select 'site' as scope
    union
    select 'post:' || slug from unnest(p_slugs) as posts(slug)
    where p_run->>'status' = 'accepted'
  ) as scopes
  order by scope
  on conflict (scope) do update
  set latest = case
        when (excluded.latest->>'ran_at')::timestamptz >= (previous.latest->>'ran_at')::timestamptz
        then excluded.latest else previous.latest end,
      latest_accepted = case
        when excluded.latest_accepted is not null and (
          previous.latest_accepted is null or
          (excluded.latest_accepted->>'started_at')::timestamptz >= (previous.latest_accepted->>'started_at')::timestamptz
        )
        then excluded.latest_accepted else previous.latest_accepted end;
$$;

revoke all on function public.record_indexnow_submission(text[], jsonb) from public, anon, authenticated;
grant execute on function public.record_indexnow_submission(text[], jsonb) to service_role;
