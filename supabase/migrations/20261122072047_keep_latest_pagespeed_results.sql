-- Apply after the PageSpeed route has switched to the fixed cache keys.
with removed as (
  delete from public.api_cache
  where key ~ '^psi-homepage-[0-9]{4}-[0-9]{2}-[0-9]{2}(-mobile|-desktop)?$'
  returning key, data, fetched_at
), latest as (
  select distinct on (data ->> 'strategy')
    'psi-homepage-latest-' || (data ->> 'strategy') as key,
    data,
    fetched_at
  from removed
  where (data ->> 'strategy') in ('mobile', 'desktop')
    and key like '%-' || (data ->> 'strategy')
  order by data ->> 'strategy', removed.key desc
)
insert into public.api_cache (key, data, fetched_at)
select key, data, fetched_at from latest
on conflict (key) do nothing;
