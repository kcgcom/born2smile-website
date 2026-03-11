# Firestore 데이터 아키텍처

블로그 포스트의 Single Source of Truth가 파일(`lib/blog/posts/*.ts`)에서 **Firestore**(`blog-posts` 컬렉션)로 이전됨. 파일 기반 데이터는 폴백으로 유지.

## 컬렉션 구조

| 컬렉션 | 문서 ID | 용도 | 접근 |
|--------|---------|------|------|
| `blog-posts` | `{slug}` | 블로그 포스트 (80개) | Admin SDK 전용 |
| `blog-likes` | `{slug}` | 좋아요 카운트 + 사용자 UUID | 클라이언트 read/write |
| `site-config` | `links\|clinic\|hours\|schedule` | 사이트 설정 + 발행 스케줄 | Admin SDK 전용 |
| `api-cache` | `searchad-volume-{YYYY-MM-DD}` | 검색광고 API 일별 캐시 | Admin SDK 전용 |

## 복합 인덱스 (3개)

`firestore.indexes.json`에 정의:

- `blog-posts`: `published` ASC + `date` DESC
- `blog-posts`: `category` ASC + `date` DESC
- `blog-posts`: `published` ASC + `category` ASC + `date` DESC

인덱스 배포: `npx tsx scripts/deploy-firestore.ts` (REST API로 인덱스 + 규칙 배포)

## 보안 규칙

`firestore.rules`에 정의:

| 컬렉션 | 읽기 | 쓰기 | 비고 |
|--------|------|------|------|
| `blog-likes/{slug}` | 모든 사용자 | 모든 사용자 | `count`, `users` 필드 검증 |
| `blog-posts` | 차단 | 차단 | Admin SDK 전용 (서버 사이드) |
| `site-config` | 차단 | 차단 | Admin SDK 전용 (서버 사이드) |
| 나머지 | 차단 | 차단 | 기본 전체 차단 |

## 폴백 전략

Firestore 복합 인덱스 미배포 시 `FAILED_PRECONDITION` 에러를 감지하여 파일 기반 `BLOG_POSTS_META`로 자동 폴백. 빌드 안정성 보장.

관련 코드: `lib/blog-firestore.ts`의 `getPublishedBlogPosts()` catch 블록.

## 캐싱

`unstable_cache` + `revalidateTag` 조합 (`app/api/admin/_lib/cache.ts`).

| 대상 | TTL | 비고 |
|------|-----|------|
| GA4 트래픽 | 1시간 | `unstable_cache` |
| Search Console / DataLab / PSI | 6시간 | `unstable_cache` |
| 검색광고 검색량 | 24시간 | L1 `unstable_cache` + L2 Firestore `api-cache` |
| 블로그 목록 (공개) | 1시간 | ISR `revalidate: 3600` |
| 블로그 목록 (관리자) | 5분 | `unstable_cache` |
| 좋아요 집계 | 5분 | `unstable_cache` |
| 사이트 설정 | 1시간 | `unstable_cache` |

CRUD 후 `revalidateTag()`으로 즉시 무효화. 검색광고 API는 2-tier 캐시: L1 `unstable_cache`(24시간) → L2 Firestore `api-cache`(일별 영구) → API 호출. Cloud Run 콜드 스타트 시에도 Firestore에서 읽어 하루 1회만 API 호출.

## 마이그레이션

파일 → Firestore 초기 마이그레이션: `npx tsx scripts/migrate-blog-to-firestore.ts` (1회성). 검증: `npx tsx scripts/verify-migration.ts`.
