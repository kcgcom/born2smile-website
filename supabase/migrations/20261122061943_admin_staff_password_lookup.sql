create function public.find_admin_staff_auth_user(account_email text)
returns uuid
language sql stable security invoker
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(account_email)
    and is_sso_user is false
  limit 1;
$$;

-- Give the server role access through the lookup only.
alter function public.find_admin_staff_auth_user(text) security definer;
revoke all on function public.find_admin_staff_auth_user(text) from public, anon, authenticated;
grant execute on function public.find_admin_staff_auth_user(text) to service_role;
