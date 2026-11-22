create table public.pagespeed_measurement_runs (
  strategy text primary key check (strategy in ('mobile', 'desktop')),
  run_id uuid,
  started_at timestamptz,
  expires_at timestamptz,
  retry_at timestamptz,
  last_success_at timestamptz
);

alter table public.pagespeed_measurement_runs enable row level security;
revoke all on public.pagespeed_measurement_runs from public, anon, authenticated;
grant select, insert, update on public.pagespeed_measurement_runs to service_role;

create function public.claim_pagespeed_measurement(p_strategy text, p_manual boolean)
returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  run public.pagespeed_measurement_runs%rowtype;
  claimed_at timestamptz;
begin
  insert into public.pagespeed_measurement_runs (strategy)
  values (p_strategy)
  on conflict (strategy) do nothing;

  select * into run
  from public.pagespeed_measurement_runs
  where strategy = p_strategy
  for update;

  claimed_at := clock_timestamp();
  if run.expires_at > claimed_at then
    return jsonb_build_object('status', 'running', 'runId', run.run_id, 'startedAt', run.started_at);
  end if;

  if not p_manual then
    if run.retry_at > claimed_at then
      return jsonb_build_object('status', 'cooldown');
    end if;

    -- Another request may have refreshed the result after the caller read it.
    if exists (
      select 1 from public.api_cache
      where key = 'psi-homepage-latest-' || p_strategy
        and data ->> 'strategy' = p_strategy
        and timezone('Asia/Seoul', fetched_at)::date = timezone('Asia/Seoul', claimed_at)::date
    ) then
      return jsonb_build_object('status', 'fresh');
    end if;
  end if;

  update public.pagespeed_measurement_runs
  set run_id = gen_random_uuid(),
    started_at = claimed_at,
    expires_at = claimed_at + interval '100 seconds',
    -- Also bound retries when a worker exits without recording an outcome.
    retry_at = claimed_at + interval '5 minutes 100 seconds'
  where strategy = p_strategy
  returning * into run;

  return jsonb_build_object('status', 'claimed', 'runId', run.run_id, 'startedAt', run.started_at);
end;
$$;

create function public.finish_pagespeed_measurement(p_strategy text, p_run_id uuid, p_result jsonb)
returns boolean
language plpgsql security invoker
set search_path = ''
as $$
declare
  completed_at timestamptz := clock_timestamp();
begin
  update public.pagespeed_measurement_runs
  set expires_at = null,
    retry_at = case when p_result is null then completed_at + interval '5 minutes' end,
    last_success_at = case when p_result is not null then completed_at else last_success_at end
  where strategy = p_strategy and run_id = p_run_id and expires_at > clock_timestamp();

  if not found then
    return false;
  end if;

  if p_result is not null then
    insert into public.api_cache (key, data, fetched_at)
    values ('psi-homepage-latest-' || p_strategy, p_result, (p_result ->> 'fetchedAt')::timestamptz)
    on conflict (key) do update set data = excluded.data, fetched_at = excluded.fetched_at;
  end if;

  return true;
end;
$$;

revoke execute on function public.claim_pagespeed_measurement(text, boolean) from public, anon, authenticated;
revoke execute on function public.finish_pagespeed_measurement(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_pagespeed_measurement(text, boolean) to service_role;
grant execute on function public.finish_pagespeed_measurement(text, uuid, jsonb) to service_role;
