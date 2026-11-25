create function public.record_admin_browser_presence(
  p_email text,
  p_browser_id uuid,
  p_device_name text,
  p_public_ip inet
)
returns void
language sql
set search_path = ''
as $$
  insert into public.admin_browser_presence as presence (
    email, browser_id, device_name, public_ip, last_seen_at
  )
  select p_email, p_browser_id, p_device_name, p_public_ip, statement_timestamp()
  where not exists (
    select 1
    from public.admin_browser_presence as previous
    where previous.email = p_email
      and previous.browser_id = p_browser_id
      and (
        previous.last_seen_at > statement_timestamp()
        or (
          previous.last_seen_at > statement_timestamp() - interval '3 minutes'
          and previous.device_name is not distinct from p_device_name
          and previous.public_ip is not distinct from p_public_ip
        )
      )
  )
  on conflict (email, browser_id) do update
  set device_name = excluded.device_name,
      public_ip = excluded.public_ip,
      last_seen_at = excluded.last_seen_at
  -- Recheck after acquiring the row lock when reports from multiple tabs overlap.
  where presence.last_seen_at <= excluded.last_seen_at
    and (
      presence.last_seen_at <= excluded.last_seen_at - interval '3 minutes'
      or presence.device_name is distinct from excluded.device_name
      or presence.public_ip is distinct from excluded.public_ip
    );
$$;

revoke all on function public.record_admin_browser_presence(text, uuid, text, inet) from public, anon, authenticated;
grant execute on function public.record_admin_browser_presence(text, uuid, text, inet) to service_role;
