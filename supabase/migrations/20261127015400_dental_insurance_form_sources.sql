drop function public.list_dental_insurance_forms();

create function public.list_dental_insurance_forms()
returns table (
  id text,
  insurer text,
  title text,
  "createdAt" timestamptz,
  "sourceUrl" text,
  "sourcePageUrl" text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    left(name, -4),
    user_metadata ->> 'insurer',
    user_metadata ->> 'title',
    created_at,
    user_metadata ->> 'sourceUrl',
    user_metadata ->> 'sourcePageUrl'
  from storage.objects
  where bucket_id = 'dental-insurance-forms'
    and name ~ '^[0-9a-f-]{36}[.]pdf$'
    and user_metadata ?& array['insurer', 'title'];
$$;

revoke execute on function public.list_dental_insurance_forms() from public, anon, authenticated;
grant execute on function public.list_dental_insurance_forms() to service_role;
