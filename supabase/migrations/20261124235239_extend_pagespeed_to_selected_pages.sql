alter table public.pagespeed_measurement_runs
  drop constraint pagespeed_measurement_runs_strategy_check,
  add constraint pagespeed_measurement_runs_strategy_check check (
    strategy in (
      'mobile', 'desktop',
      'blog-mobile', 'blog-desktop',
      'implant-mobile', 'implant-desktop',
      'contact-mobile', 'contact-desktop'
    )
  );

-- Keep the existing RPC signature, homepage rows and cache keys during rollout.
create or replace function public.finish_pagespeed_measurement(p_strategy text, p_run_id uuid, p_result jsonb)
returns boolean
language plpgsql security invoker
set search_path = ''
as $$
declare
  completed_at timestamptz := clock_timestamp();
  result_key text;
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
    result_key := case when p_strategy in ('mobile', 'desktop')
      then 'psi-homepage-latest-' || p_strategy
      else 'psi-latest-' || p_strategy
    end;
    insert into public.api_cache (key, data, fetched_at)
    values (result_key, p_result, (p_result ->> 'fetchedAt')::timestamptz)
    on conflict (key) do update set data = excluded.data, fetched_at = excluded.fetched_at;
  end if;

  return true;
end;
$$;
