insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dental-insurance-forms', 'dental-insurance-forms', false, 4194304, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage writes the PDF and its display metadata together.
create function public.list_dental_insurance_forms()
returns table (id text, insurer text, title text, "createdAt" timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select left(name, -4), user_metadata ->> 'insurer', user_metadata ->> 'title', created_at
  from storage.objects
  where bucket_id = 'dental-insurance-forms'
    and name ~ '^[0-9a-f-]{36}[.]pdf$'
    and user_metadata ?& array['insurer', 'title'];
$$;

revoke execute on function public.list_dental_insurance_forms() from public, anon, authenticated;
grant execute on function public.list_dental_insurance_forms() to service_role;
