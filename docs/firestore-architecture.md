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

- `blog-posts`: `published` ASC + `date` DESC
- `blog-posts`: `category` ASC + `date` DESC
- `blog-posts`: `published` ASC + `category` ASC + `date` DESC

## 폴백 전략

Firestore 복합 인덱스 미배포 시 `FAILED_PRECONDITION` 에러를 감지하여 파일 기반 `BLOG_POSTS_META`로 자동 폴백. 빌드 안정성 보장.

## 캐싱

`unstable_cache` + `revalidateTag` 조합. 블로그 TTL 1시간, 사이트 설정 TTL 1시간, 관리자 블로그 목록 5분. CRUD 후 `revalidateTag(tag, "max")`으로 즉시 무효화. 검색광고 API는 2-tier 캐시: L1 `unstable_cache`(24시간) → L2 Firestore `api-cache` 컬렉션(일별 영구) → API 호출. Cloud Run 콜드 스타트 시에도 Firestore에서 읽어 하루 1회만 API 호출.
