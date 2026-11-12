# Supabase 데이터 아키텍처

블로그 포스트의 Single Source of Truth는 **Supabase**(`blog_posts` 테이블)다. 다만 공개 블로그는 안정적인 정적 생성을 위해 `pnpm dev`, `pnpm build` 시점에는 빌드 직전 생성한 snapshot(`lib/blog/generated/posts-snapshot.ts`)을 기준으로 렌더링하며, 런타임 공개 조회는 Supabase 우선 + snapshot 폴백 전략을 사용한다.

> 코드·마이그레이션 대조: 2026-11-12. 이 문서는 저장소 구현을 설명하며 운영 DB에 모든 마이그레이션이 적용됐음을 보증하지 않는다.

## 테이블 구조

### 핵심 콘텐츠·설정

| 테이블 | 키 | 용도 | 접근 |
|--------|---------|------|------|
| `blog_posts` | `slug` | 블로그 포스트 | Supabase Admin 전용 |
| `blog_likes` | `slug` | 좋아요 카운트 + 사용자 UUID | 클라이언트 RPC |
| `site_config` | `type` (`links\|clinic\|hours\|schedule`) | 사이트 설정 + 발행 스케줄 | Supabase Admin 전용 |
| `api_cache` | `key` | 외부 API 캐시와 관리자 검토 결과 | Supabase Admin 전용 |
| `gsc_index_status` / `gsc_index_events` / `gsc_index_monitor_runs` | `url` / `id` | URL 색인 상태·변경 이력·검사 작업 | Supabase Admin 전용 |
| `research_pages` | `slug` | 검증 상태를 포함한 연구 자료 페이지 | 공개 읽기 + Supabase Admin 쓰기 |

### 콘텐츠 계획

| 테이블 | 키 | 용도 | 접근 |
|--------|---------|------|------|
| `content_planner_items` | `id` | 승인된 콘텐츠 기회와 실행 상태 | Supabase Admin 전용 |

### 검색 데이터·키워드 택소노미

| 테이블 | 키 | 용도 | 접근 |
|--------|---------|------|------|
| `searchad_sync_jobs` | `id` | SearchAd 비동기 수집·후보 분석 작업 상태 | Supabase Admin 전용 |
| `searchad_snapshots` | `id` | 택소노미 버전별 SearchAd 불변 스냅샷 | Supabase Admin 전용 |
| `searchad_snapshot_pointer` | `singleton` | 현재 활성 SearchAd 스냅샷 포인터 | Supabase Admin 전용 |
| `datalab_snapshots` | `id` | 택소노미 버전별 DataLab 단기·장기 스냅샷 | Supabase Admin 전용 |
| `datalab_snapshot_pointer` | `singleton` | 현재 활성 DataLab 스냅샷 포인터 | Supabase Admin 전용 |
| `keyword_taxonomy_versions` | `id` | pending/active/archived 키워드 택소노미 버전 | Supabase Admin 전용 |
| `keyword_taxonomy_candidates` | `id` | SearchAd에서 발견한 키워드 추가 후보와 검토 상태 | Supabase Admin 전용 |

## RLS 정책

Row Level Security로 보안:

| 테이블 | 읽기 | 쓰기 | 비고 |
|--------|------|------|------|
| `blog_likes` | 모든 사용자 | RPC를 통해서만 | `toggle_like`, `get_like` RPC 함수 |
| `blog_posts` | 차단 | 차단 | Supabase Admin (service_role) 전용 |
| `site_config` | 차단 | 차단 | Supabase Admin (service_role) 전용 |
| `research_pages` | 모든 사용자 | 차단 | 공개 SELECT, 쓰기는 service_role 전용 |
| 나머지 | 차단 | 차단 | RLS 정책 없이 service_role만 접근 |

관리자 API는 `app/api/admin/_lib/auth.ts`에서 access token·관리자 이메일 또는 설정된 ADMIN_CLI_SECRET 경로로 인증한 뒤 service_role 클라이언트로 접근한다. 브라우저 UI의 관리자 플래그만으로 접근을 허용하지 않는다.

## RPC 함수

- `toggle_like(p_slug, p_user_id)`: 좋아요 토글 (insert or delete)
- `get_like(p_slug, p_user_id)`: 좋아요 상태 조회 (count + liked)
- `activate_keyword_taxonomy(...)`: 새 택소노미를 즉시 활성화하고 기존 active 버전을 보관
- `save_pending_keyword_taxonomy(...)`: 검토 중인 택소노미 버전과 승인 후보 저장
- `discard_pending_keyword_taxonomy()`: pending 버전을 폐기하고 연결된 후보 상태 복원
- `refresh_keyword_taxonomy_candidates(...)`: SearchAd 후보를 최신 스냅샷 기준으로 갱신
- `publish_keyword_analysis(...)`: 택소노미와 SearchAd/DataLab 활성 포인터를 원자적으로 게시

좋아요 함수는 anon/authenticated 역할에 공개한다. 택소노미 함수는 public 실행 권한을 회수하고 service_role에만 허용한다.

## 폴백 전략

snapshot(`BLOG_POSTS_SNAPSHOT`)은 `pnpm generate-blog-snapshot`으로 생성되며 `pnpm dev`, `pnpm build`에서 자동 갱신된다.

- 개발/빌드 시 공개 블로그 페이지(`/blog`, `/blog/[category]`, `/blog/[category]/[slug]`, `sitemap.xml`)는 snapshot을 기준으로 정적 생성된다.
- 런타임 공개 블로그 조회는 Supabase 우선이며, 쿼리 실패 시 snapshot으로 자동 폴백한다.
- 관리자 fresh 읽기는 Supabase를 직접 조회하되 일부 조회 함수는 실패·미설정 시 스냅샷으로 폴백한다. 쓰기는 DB에 수행하며 스냅샷 파일을 쓰기 저장소로 사용하지 않는다.
- 기본 런타임 폴백과 `BLOG_PUBLIC_DATA_SOURCE=snapshot` 강제 조회 모드를 구분한다. 빌드·개발은 강제 모드를 설정한다.
- 수동 원고 파일을 합치는 경로는 없다. 스냅샷은 마지막 생성 시점의 복사본이며 Storage 이미지까지 보존하는 전체 백업이 아니다.

관련 코드: `lib/blog-supabase.ts`

## 캐싱

`unstable_cache` + `revalidateTag` 조합 (`app/api/admin/_lib/cache.ts`).

| 대상 | TTL | 비고 |
|------|-----|------|
| GA4 트래픽 | KST 다음 자정까지, 최소 10분 | `secondsUntilMidnightKST` |
| Search Console | 6시간 | 서버 캐시 |
| DataLab | 24시간 | 서버 캐시 |
| PSI | KST 날짜별 | 환경별 Supabase 캐시. 이전 결과는 stale 표시 후 백그라운드 갱신, force=true는 재측정 |
| 검색광고 검색량 | 수집·게시 시 갱신 | SearchAd 스냅샷과 활성 포인터 사용 |
| 블로그 목록 (공개) | 1시간 | ISR `revalidate: 3600` |
| 블로그 목록 (관리자) | 서버 조회 캐시 없음 | `getAllPostMetasFresh` 직접 조회 |
| 좋아요 집계 | 5분 | `unstable_cache` |
| 사이트 설정 | 1시간 | `unstable_cache` |

CRUD 후 태그·경로 재검증을 요청한다. `revalidateTag(tag, "max")`를 쓰는 경로도 있으므로 모든 응답이 즉시 최신값으로 교체된다고 가정하지 않는다. 검색광고 데이터는 `lib/admin-searchad-snapshots.ts`의 수집 작업이 API에서 가져오고, SearchAd/DataLab 스냅샷과 활성 포인터를 게시한다. 소비 경로는 활성 스냅샷을 읽으며, 삭제된 일별 api_cache 래퍼를 사용하지 않는다. 수집 일정과 수동 갱신은 조회 응답 캐시와 구분한다.

## 마이그레이션

| 범위 | 마이그레이션 |
|------|-------------|
| 초기 블로그·좋아요·설정·API 캐시 | `001_initial_schema.sql`, `002_blog_category_slugs.sql` |
| 블로그 이미지 Storage 정책 | `007_blog_images_storage.sql` |
| 연구 자료와 검증 상태 | `008_research_pages.sql`, `009_research_verified.sql` |
| 제거된 AI 기능 정리 | `010_drop_ai_ops.sql`, `011_drop_ai_write_logs.sql` |
| 콘텐츠 플래너 | `012_content_planner.sql`, `019_content_planner_faq.sql` |
| SearchAd 수집·스냅샷 | `013_searchad_snapshots.sql`, `018_candidate_analysis_status.sql` |
| 키워드 택소노미·후보 거버넌스 | `014_keyword_taxonomy.sql`~`017_candidate_pending_version.sql`, `020_reset_empty_taxonomy_identity.sql` |
| DataLab 스냅샷과 분석 게시 | `015_keyword_analysis_publish.sql` |
| 수정일 정리·reviewed_date 제거 | `021_cleanup_blog_date_modified.sql`~`023_cleanup_march25_blog_date_modified.sql` |
| Search Console 색인 모니터 | `024_gsc_index_monitor.sql` |

`003_ai_write_logs.sql`~`006_ai_ops_low_traffic.sql`은 과거 기능의 이력이다. 해당 테이블은 `010_drop_ai_ops.sql`과 `011_drop_ai_write_logs.sql`에서 삭제되므로 현재 스키마에 포함하지 않는다.
