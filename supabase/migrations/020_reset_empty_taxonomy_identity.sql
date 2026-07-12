do $$
begin
  if exists (select 1 from public.keyword_taxonomy_versions) then
    raise exception 'keyword_taxonomy_versions is not empty; refusing to reset identity';
  end if;

  execute 'alter table public.keyword_taxonomy_versions alter column version restart with 1';
end;
$$;

comment on table public.keyword_taxonomy_versions is
  '관리자가 활성화한 전체 키워드 택소노미 버전. 비어 있던 버전 저장소를 코드 택소노미 v1로 복구할 수 있도록 identity를 재초기화함.';
