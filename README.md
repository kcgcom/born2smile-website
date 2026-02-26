# 서울본치과 웹사이트

김포 서울본치과 공식 웹사이트. Next.js 기반 풀스택 앱으로, Firebase App Hosting(Cloud Run + Cloud CDN)에 배포됩니다.

- **사이트**: https://www.born2smile.co.kr
- **Firebase 프로젝트**: `seoul-born2smile`

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16, React 19, TypeScript 5 (strict) |
| 스타일링 | Tailwind CSS 4, CSS custom properties |
| 데이터베이스 | Firebase Firestore |
| 인증 | Firebase Auth (Google 로그인, 관리자 전용) |
| 분석 | GA4 Data API, Search Console API, 네이버 DataLab/검색광고 API |
| 배포 | Firebase App Hosting (Cloud Build → Cloud Run) |
| 패키지 매니저 | pnpm |

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 환경변수 설정 (docs/environment-variables.md 참조)
pnpm dev                      # http://localhost:3000
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `pnpm dev` | 개발 서버 (블로그 메타데이터 + 매니페스트 자동 생성) |
| `pnpm build` | 프로덕션 빌드 (standalone output) |
| `pnpm start` | 프로덕션 서버 (로컬 테스트) |
| `pnpm lint` | ESLint 실행 |
| `pnpm deploy` | Firebase App Hosting 배포 |

## 프로젝트 구조

```
app/                  # Next.js App Router 페이지
  admin/              #   관리자 대시보드 (6탭: 개발/트래픽/검색/트렌드/블로그/설정)
  api/                #   API Routes (GA4, Search Console, 블로그 CRUD 등)
  blog/               #   블로그 (카테고리/슬러그 계층 구조)
  treatments/         #   진료 과목 (6개)
components/           # React 컴포넌트 (blog/, admin/, layout/, ui/)
hooks/                # 공유 훅 (인증, 발행 팝업)
lib/                  # 비즈니스 로직, API 클라이언트, 상수
  blog/               #   블로그 타입, 카테고리, 포스트 파일
  constants.ts        #   병원 정보 Single Source of Truth
docs/                 # 상세 문서
scripts/              # 빌드/마이그레이션/IndexNow 스크립트
```

## 문서

| 문서 | 내용 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 프로젝트 전체 지침 (AI 도구용, 아키텍처/컨벤션/태스크 상세) |
| [docs/environment-variables.md](docs/environment-variables.md) | 환경변수 목록 및 설정 가이드 |
| [docs/firestore-architecture.md](docs/firestore-architecture.md) | Firestore 컬렉션/인덱스/캐싱 구조 |
| [docs/blog-workflow.md](docs/blog-workflow.md) | 블로그 발행 워크플로우 (초안→예약→발행) |
| [docs/blog-writing-guide.md](docs/blog-writing-guide.md) | 블로그 작성 가이드 (브랜드 보이스, 용어 통일표) |
| [docs/todo.md](docs/todo.md) | 미완료 항목 및 개선 과제 |

## 배포

Firebase App Hosting으로 자동 배포:

1. GitHub push → Cloud Build → Cloud Run + Cloud CDN
2. `apphosting.yaml`에서 런타임 설정 (scale-to-zero, max 4 인스턴스)
3. 매일 KST 00:05 자동 재빌드로 예약 포스트 발행 (GitHub Actions)

## 라이선스

Private repository. All rights reserved.
