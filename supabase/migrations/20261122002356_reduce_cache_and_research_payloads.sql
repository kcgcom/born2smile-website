create function public.get_keyword_embedding_cache_entries(
  p_cache_key text,
  p_query_keys jsonb,
  p_dimensions integer
)
returns table (query text, embedding jsonb)
language sql stable security invoker
set search_path = ''
as $$
  with requested as materialized (
    select requested_key.key as query, case
      when jsonb_typeof(entry.data) = 'array' then
        case when jsonb_array_length(entry.data) = p_dimensions
          and not (entry.data @? '$[*] ? (@.type() != "number")')
          then entry.data
        end
    end as embedding
    from jsonb_each_text(p_query_keys) as requested_key
    left join public.api_cache as entry
      on entry.key = requested_key.value
  ), legacy as materialized (
    select data -> 'embeddings' as embeddings
    from public.api_cache
    where key = p_cache_key
      and exists (select 1 from requested where embedding is null)
  )
  select requested.query, coalesce(requested.embedding, legacy.embeddings -> requested.query)
  from requested
  left join legacy on true
  where coalesce(requested.embedding, legacy.embeddings -> requested.query) is not null;
$$;

revoke execute on function public.get_keyword_embedding_cache_entries(text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.get_keyword_embedding_cache_entries(text, jsonb, integer)
  to service_role;

create function public.get_research_hub_cards(p_include_unverified boolean)
returns table (verified boolean, card jsonb)
language sql stable security invoker
set search_path = ''
as $$
  select page.verified, jsonb_build_object(
    'slug', page.data -> 'slug',
    'title', page.data -> 'title',
    'category', page.data -> 'category',
    'description', page.data -> 'description',
    'hubSummary', page.data -> 'hubSummary',
    'hubHighlightStat', page.data -> 'hubHighlightStat',
    'hubHighlightLabel', page.data -> 'hubHighlightLabel',
    'hubHighlightContext', page.data -> 'hubHighlightContext',
    'paperCount', jsonb_array_length(page.data -> 'papers'),
    'firstFinding', page.data #> '{papers,0,keyFindings,0}'
  ) as card
  from public.research_pages as page
  where page.data is not null and (p_include_unverified or page.verified is true)
  order by page.slug;
$$;

revoke execute on function public.get_research_hub_cards(boolean) from public, anon, authenticated;
grant execute on function public.get_research_hub_cards(boolean) to service_role;
