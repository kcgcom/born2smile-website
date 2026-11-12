<!-- Parent: ../AGENTS.md -->
<!-- Updated: 2026-11-12 -->

# lib/blog/

## 역할과 주요 파일

블로그 타입, 카테고리 URL 매핑, 본문 블록 처리, 메타데이터 및 진료 과목 연결을 관리한다.

| 파일·디렉터리 | 역할 |
|---|---|
| `types.ts` | `BlogPost`, `BlogPostMeta`, `BlogBlock`, 카테고리·태그 타입과 상수 |
| `category-slugs.ts` | 카테고리 slug·한국어 표시명 변환, URL 생성의 단일 소스 |
| `category-colors.ts` | 카테고리별 표시 색상 |
| `index.ts` | 타입·상수·헬퍼와 `BLOG_POSTS_META` 재노출, 진료 과목 연결 |
| `category-hubs/` | 카테고리 허브별 소개와 탐색 콘텐츠 |
| `generated/posts-snapshot.ts` | Supabase에서 가져온 본문·발행 상태 포함 스냅샷. 자동 생성, Git 제외 |
| `generated/posts-meta.ts` | 스냅샷에서 추출한 본문 없는 메타데이터. 자동 생성, Git 제외 |

## 글 저장·조회 원칙

- 원본 글은 Supabase의 `blog_posts`에 저장한다. 새 글 작성·수정은 관리자 화면과 인증·입력 검증을 거치는 관리자 API를 사용한다.
- 본문은 `BlogBlock[]` 형식의 `blocks`를 사용한다. 실제 타입과 검증은 `types.ts`, `../blog-validation.ts`를 확인한다.
- 수동 TypeScript 원고 디렉터리는 사용하지 않는다. 생성 파일을 직접 편집하거나 별도 원고를 장애 대비 데이터로 연결하지 않는다.
- 공개 조회는 `../blog-supabase.ts`를 사용한다. 기본 런타임 조회는 Supabase 우선이며 실패 시 `BLOG_POSTS_SNAPSHOT`으로 폴백한다.
- `BLOG_PUBLIC_DATA_SOURCE=snapshot`이면 공개 조회는 스냅샷을 우선 사용한다. `pnpm dev`와 `pnpm build`는 이 모드로 실행한다.
- 공개 글은 `published`와 KST 기준 발행일을 모두 확인한다. `BLOG_POSTS_META`는 발행 상태를 포함하지 않으므로 공개 여부 판단이나 본문 장애 폴백에 직접 사용하지 않는다.
- 스냅샷은 마지막 생성 시점의 데이터다. 최신 DB 상태나 이미지 파일까지 보장하는 전체 백업으로 취급하지 않는다.

## 생성과 검증

1. `pnpm generate-blog-snapshot`: Supabase에서 본문과 발행 상태를 읽어 스냅샷을 생성한다.
2. `pnpm generate-blog-meta`: 기존 스냅샷에서 메타데이터를 추출한다. 최신 DB 변경을 반영하려면 스냅샷부터 갱신한다.
3. `pnpm dev`와 `pnpm build`는 위 두 단계를 순서대로 실행한다.
4. 빌드는 `BLOG_SNAPSHOT_REQUIRED=true`로 실행한다. 환경변수 누락이나 Supabase 조회 실패 시 빌드가 실패하며, 이를 우회하지 않는다.
5. 개발용 스냅샷 생성은 환경변수 누락·조회 실패 시 기존 스냅샷을 유지할 수 있다. 환경변수가 없고 기존 파일도 없으면 빈 스냅샷을 생성한다.
6. 생성 파일은 생성 스크립트로만 갱신한다. 앱 코드 변경 검증은 루트 `AGENTS.md`를 따른다.

## 카테고리와 진료 과목

- 저장·URL용 slug와 한국어 표시명을 구분한다. `getCategorySlug`, `getCategoryLabel` 등 기존 변환 함수를 사용한다.
- `TREATMENT_CATEGORY_MAP`의 값은 카테고리 slug다. 예: `scaling` 진료 과목은 `prevention` 카테고리에 연결된다.
- 카테고리 변경 시 `types.ts`, `category-slugs.ts`, `category-colors.ts`와 허브·메타데이터·사이트맵의 일치 여부를 확인한다.
- 태그와 본문 블록 목록은 `types.ts`를 기준으로 한다. 문서에 고정 개수를 복제하지 않는다.
