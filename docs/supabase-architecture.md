# Supabase 데이터 아키텍처

블로그 포스트의 Single Source of Truth는 **Supabase**(`blog_posts` 테이블)다. 공개 블로그는 Supabase 조회 실패 시 빌드 시점에 생성한 snapshot(`lib/blog/generated/posts-snapshot.ts`)으로 폴백한다.

## 테이블 구조

| 테이블 | 키 | 용도 | 접근 |
|--------|---------|------|------|
| `blog_posts` | `slug` | 블로그 포스트 (80개) | Supabase Admin 전용 |
| `blog_likes` | `slug` | 좋아요 카운트 + 사용자 UUID | 클라이언트 RPC |
| `site_config` | `type` (`links\|clinic\|hours\|schedule`) | 사이트 설정 + 발행 스케줄 | Supabase Admin 전용 |
| `api_cache` | `key` (`searchad-volume-{YYYY-MM-DD}`) | 검색광고 API 일별 캐시 | Supabase Admin 전용 |

## RLS 정책

Row Level Security로 보안:

| 테이블 | 읽기 | 쓰기 | 비고 |
|--------|------|------|------|
| `blog_likes` | 모든 사용자 | RPC를 통해서만 | `toggle_like`, `get_like` RPC 함수 |
| `blog_posts` | 차단 | 차단 | Supabase Admin (service_role) 전용 |
| `site_config` | 차단 | 차단 | Supabase Admin (service_role) 전용 |
| 나머지 | 차단 | 차단 | 기본 전체 차단 |

## RPC 함수

- `toggle_like(post_slug, user_id)`: 좋아요 토글 (insert or delete)
- `get_like(post_slug, user_id)`: 좋아요 상태 조회 (count + liked)

## 폴백 전략

Supabase 쿼리 실패 시 snapshot(`BLOG_POSTS_SNAPSHOT`)으로 자동 폴백한다. snapshot은 `pnpm generate-blog-snapshot`으로 생성되며 `pnpm dev`, `pnpm build`에서 자동 갱신된다.

관련 코드: `lib/blog-supabase.ts`

## 캐싱

`unstable_cache` + `revalidateTag` 조합 (`app/api/admin/_lib/cache.ts`).

| 대상 | TTL | 비고 |
|------|-----|------|
| GA4 트래픽 | 1시간 | `unstable_cache` |
| Search Console / DataLab / PSI | 6시간 | `unstable_cache` |
| 검색광고 검색량 | 24시간 | L1 `unstable_cache` + L2 Supabase `api_cache` |
| 블로그 목록 (공개) | 1시간 | ISR `revalidate: 3600` |
| 블로그 목록 (관리자) | 5분 | `unstable_cache` |
| 좋아요 집계 | 5분 | `unstable_cache` |
| 사이트 설정 | 1시간 | `unstable_cache` |

CRUD 후 `revalidateTag()`으로 즉시 무효화. 검색광고 API는 2-tier 캐시: L1 `unstable_cache`(24시간) → L2 Supabase `api_cache`(일별 영구) → API 호출. Vercel Serverless Functions 콜드 스타트 시에도 Supabase에서 읽어 하루 1회만 API 호출.

## 마이그레이션

초기 스키마: `supabase/migrations/001_initial_schema.sql` (4 테이블, RLS, RPC).
