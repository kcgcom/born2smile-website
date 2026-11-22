-- SearchAd reads the active snapshots. Retire only the old daily volume keys.
delete from public.api_cache
where key ~ '^searchad-volume-[0-9]{4}-[0-9]{2}-[0-9]{2}$';

-- Use the same UTF-8 SHA-256 keys as lib/admin-keyword-embeddings.ts.
do $$
declare
  legacy_key constant text := 'keyword-embeddings:gemini-embedding-2:768';
  legacy_embeddings jsonb;
  legacy_fetched_at timestamptz;
begin
  select data -> 'embeddings', fetched_at
  into legacy_embeddings, legacy_fetched_at
  from public.api_cache
  where key = legacy_key
  for update;

  if not found then
    return;
  end if;

  if jsonb_typeof(legacy_embeddings) is distinct from 'object' then
    raise warning 'Unexpected legacy keyword embedding cache format. Kept the original row.';
    return;
  end if;

  insert into public.api_cache (key, data, fetched_at)
  select legacy_key || ':query:' || encode(sha256(convert_to(entry.key, 'UTF8')), 'hex'),
    entry.value,
    legacy_fetched_at
  from jsonb_each(legacy_embeddings) as entry
  where case when jsonb_typeof(entry.value) = 'array' then
    jsonb_array_length(entry.value) = 768
      and not (entry.value @? '$[*] ? (@.type() != "number")')
  else false end
  on conflict (key) do nothing;

  -- Preserve the fallback if any original query lacks a usable destination.
  if exists (
    select 1
    from jsonb_each(legacy_embeddings) as entry
    left join public.api_cache as destination
      on destination.key = legacy_key || ':query:' || encode(sha256(convert_to(entry.key, 'UTF8')), 'hex')
    where not case when jsonb_typeof(destination.data) = 'array' then
      jsonb_array_length(destination.data) = 768
        and not (destination.data @? '$[*] ? (@.type() != "number")')
    else false end
  ) then
    raise warning 'Some keyword embeddings have no valid destination. Kept the original row.';
    return;
  end if;

  delete from public.api_cache where key = legacy_key;
end;
$$;
