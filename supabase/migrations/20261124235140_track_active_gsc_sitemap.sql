create table public.gsc_index_sitemap (
  singleton boolean primary key default true check (singleton),
  urls text[] not null default '{}',
  last_verified_at timestamptz,
  hold_reason text check (hold_reason in ('sitemap_unavailable', 'verification_unavailable', 'url_mismatch')),
  hold_since timestamptz,
  hold_differences integer check (hold_differences >= 0)
);

alter table public.gsc_index_sitemap enable row level security;
revoke all on public.gsc_index_sitemap from public, anon, authenticated;
grant select, update on public.gsc_index_sitemap to service_role;

insert into public.gsc_index_sitemap (urls)
select coalesce(array_agg(url order by url collate "C"), '{}'::text[])
from public.gsc_index_status
where last_seen_in_sitemap_at = (select max(last_seen_in_sitemap_at) from public.gsc_index_status);

create function public.read_gsc_active_sitemap(p_include_events boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'urls', s.urls,
    'last_verified_at', s.last_verified_at,
    'hold_reason', s.hold_reason,
    'hold_since', s.hold_since,
    'hold_differences', s.hold_differences,
    'items', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.path, item.url)
      from public.gsc_index_status as item
      where item.url = any(s.urls)
    ), '[]'::jsonb),
    'events', case when p_include_events then coalesce((
      select jsonb_agg(e order by e.observed_at desc, e.id desc)
      from (
        select id, url, from_status, to_status, observed_at
        from public.gsc_index_events
        where url = any(s.urls)
        order by observed_at desc, id desc
        limit 50
      ) as e
    ), '[]'::jsonb) else '[]'::jsonb end
  )
  from public.gsc_index_sitemap as s
  where s.singleton;
$$;

create function public.read_gsc_sitemap_blog_posts(p_today date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'category', category)), '[]'::jsonb)
  from public.blog_posts
  where published and date <= to_char(p_today, 'YYYY-MM-DD');
$$;

create function public.save_gsc_sitemap_check(
  p_run_id uuid,
  p_check_at timestamptz,
  p_urls jsonb default null,
  p_hold_reason text default null,
  p_hold_differences integer default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  verified_urls text[];
begin
  perform 1 from public.gsc_index_monitor_runs
  where id = p_run_id and status = 'running'
  for update;
  if not found then
    raise exception '색인 검사 작업이 실행 중이 아닙니다.';
  end if;

  if p_urls is null then
    if p_hold_reason is null then
      raise exception '사이트맵 동기화 보류 사유가 필요합니다.';
    end if;
    update public.gsc_index_sitemap
    set hold_reason = p_hold_reason,
        hold_since = coalesce(hold_since, p_check_at),
        hold_differences = p_hold_differences
    where singleton
      and (hold_reason, hold_differences) is distinct from (p_hold_reason, p_hold_differences);
    return;
  end if;

  if jsonb_typeof(p_urls) <> 'array' or jsonb_array_length(p_urls) = 0 or p_hold_reason is not null then
    raise exception '검증된 사이트맵 URL 목록이 필요합니다.';
  end if;

  verified_urls := array(
    select distinct entry.url collate "C"
    from jsonb_to_recordset(p_urls) as entry(url text)
    order by 1
  );

  insert into public.gsc_index_status (url, path)
  select entry.url, entry.path
  from jsonb_to_recordset(p_urls) as entry(url text, path text)
  where not exists (select 1 from public.gsc_index_status where url = entry.url)
  on conflict (url) do nothing;

  update public.gsc_index_sitemap
  set urls = verified_urls,
      last_verified_at = p_check_at,
      hold_reason = null,
      hold_since = null,
      hold_differences = null
  where singleton;
end;
$$;

revoke all on function public.read_gsc_active_sitemap(boolean) from public, anon, authenticated;
revoke all on function public.read_gsc_sitemap_blog_posts(date) from public, anon, authenticated;
revoke all on function public.save_gsc_sitemap_check(uuid, timestamptz, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.read_gsc_active_sitemap(boolean) to service_role;
grant execute on function public.read_gsc_sitemap_blog_posts(date) to service_role;
grant execute on function public.save_gsc_sitemap_check(uuid, timestamptz, jsonb, text, integer) to service_role;
