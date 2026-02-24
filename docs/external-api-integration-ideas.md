# 외부 API 연동 아이디어

> 작성일: 2026-02-24
> 상태: 계획 단계 (미구현)

관리자 대시보드(`/admin`)와 개발 대시보드(`/dev`)에 외부 API를 연동하여 유용한 정보를 표시하기 위한 아이디어 목록.

---

## 관리자 대시보드 (`/admin`)

### 1. Google Business Profile API

**목적**: 환자 리뷰/평점 현황을 대시보드에서 직접 확인

**표시 정보**:
- 평균 별점, 총 리뷰 수
- 최근 리뷰 목록 (답변 안 한 리뷰 하이라이트)
- 전화 클릭수, 길찾기 요청수, 사진 조회수

**연동 근거**:
- `lib/constants.ts`에 `GOOGLE_REVIEW` Place ID 이미 보유
- 환자 리뷰는 핵심 신뢰 신호이므로 모니터링 가치 높음

**참고**:
- [Google Business Profile API 문서](https://developers.google.com/my-business/reference/rest)
- OAuth 2.0 인증 필요, 비즈니스 소유자 권한 필요

---

### 2. 네이버 플레이스 리뷰 모니터링

**목적**: 네이버 플레이스 리뷰 수/평점 변화 추적

**표시 정보**:
- 네이버 플레이스 평점, 리뷰 수 변화 추이
- 최근 리뷰 알림

**연동 근거**:
- `lib/constants.ts`에 `NAVER_REVIEW` Place ID 이미 보유
- 한국 로컬 검색에서 네이버 플레이스 리뷰가 중요한 신뢰 신호

**참고**:
- 네이버 플레이스 공식 API가 제한적이므로, 웹 스크래핑 또는 비공식 방법 검토 필요
- 대안: 주기적 수동 입력 또는 알림 설정

---

### 3. Kakao Channel / 소셜 미디어 통계

**목적**: SNS 채널 성장 추이를 한눈에 파악

**표시 정보**:
- 카카오톡 채널 친구 수, 메시지 발송/수신 통계
- 인스타그램 팔로워 수, 최근 게시물 반응 (좋아요, 댓글)

**연동 근거**:
- `lib/constants.ts`의 `LINKS`에 SNS 링크 관리 구조 이미 존재 (현재 빈 문자열)
- SNS 채널 활성화 후 통계 모니터링 필요

**참고**:
- [Kakao Channel API](https://developers.kakao.com/docs/latest/ko/kakaotalk-channel/rest-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api) (Meta Graph API로 전환 중)

---

### 4. 검색광고 경쟁 분석 (기존 API 확장)

**목적**: 주요 키워드의 입찰가/경쟁 강도 추이 모니터링

**표시 정보**:
- "김포 치과", "김포 임플란트" 등 핵심 키워드의 월간 CPC 변화
- 경쟁 강도 지표 (높음/중간/낮음)
- 키워드별 예상 노출/클릭 비용

**연동 근거**:
- 네이버 검색광고 API 이미 연동됨 (`lib/admin-naver-searchad.ts`)
- 검색량 조회 외에 경쟁 지표 추가 조회 가능

**참고**:
- 기존 `/api/admin/naver-searchad/volume` 엔드포인트 확장 또는 별도 엔드포인트 추가
- `RelKwdStat` API 응답에 `compIdx` (경쟁 정도), `monthlyPcClkCnt`/`monthlyMobileClkCnt` 등 추가 필드 활용

---

## 개발 대시보드 (`/dev`)

### 5. GitHub API

**목적**: 배포 이력, CI 상태를 대시보드에서 직접 확인

**표시 정보**:
- 최근 커밋 목록 (메시지, 작성자, 시간)
- GitHub Actions 워크플로우 상태 (스케줄 재빌드 성공/실패 이력)
- 마지막 배포 시간
- 미해결 이슈 수

**연동 근거**:
- `.github/workflows/scheduled-rebuild.yml`로 매일 자동 재빌드 실행 중
- 재빌드 실패 시 빠른 감지 필요

**참고**:
- [GitHub REST API](https://docs.github.com/en/rest)
- Personal Access Token 또는 GitHub App 인증
- 환경변수: `GITHUB_TOKEN`, `GITHUB_REPO` (e.g., `owner/born2smile-website`)

---

### 6. Firebase / Cloud Run 메트릭

**목적**: 서버 리소스 사용량과 성능을 모니터링

**표시 정보**:
- **Cloud Run**: 요청 수, 평균 응답 시간, 에러율, cold start 빈도
- **Firestore**: 일일 읽기/쓰기 수, 무료 할당량 대비 사용률
- 비용 추정치 (무료 티어 초과 여부)

**연동 근거**:
- Firebase Admin SDK 이미 연동됨 (`lib/firebase-admin.ts`)
- Cloud Run 기반 배포이므로 서버 상태 모니터링 중요

**참고**:
- [Cloud Monitoring API](https://cloud.google.com/monitoring/api/v3)
- Firebase Admin SDK로 Firestore 사용량 조회
- 서비스 계정에 `monitoring.viewer` 역할 추가 필요

---

### 7. 도메인 / SSL 만료 모니터링

**목적**: 도메인 및 SSL 인증서 만료를 사전에 감지

**표시 정보**:
- `born2smile.co.kr` 도메인 만료일 (D-day 카운트다운)
- SSL 인증서 만료까지 남은 일수
- 만료 30일 전부터 경고 표시

**연동 근거**:
- 도메인/SSL 만료는 사이트 접근 불가로 직결
- 수동 확인 대신 자동 모니터링으로 누락 방지

**참고**:
- WHOIS API: [RDAP](https://www.icann.org/rdap) 또는 서드파티 (whoisjson.com, jsonwhois.com)
- SSL 체크: Node.js `tls` 모듈로 직접 조회 가능 (외부 API 불필요)

---

### 8. 의존성 보안 취약점

**목적**: 알려진 보안 취약점을 대시보드에서 확인

**표시 정보**:
- 취약점 수 (critical/high/moderate/low)
- 영향받는 패키지 목록
- 업데이트 가능한 주요 패키지 (Next.js, React 등)

**연동 근거**:
- 프로덕션 사이트의 보안 유지 필수
- `pnpm audit` 결과를 시각적으로 표시

**참고**:
- [Snyk API](https://snyk.docs.apiary.io/) 또는 [OSV API](https://osv.dev/docs/) (무료, Google 운영)
- 대안: 빌드 타임에 `pnpm audit --json` 실행 → 매니페스트에 포함

---

### 9. Uptime 모니터링

**목적**: 사이트 가용성을 지속적으로 추적

**표시 정보**:
- 30일 uptime % (목표: 99.9%+)
- 최근 다운타임 이력 (시작/종료/지속시간)
- 평균 응답 시간 추이 그래프

**연동 근거**:
- Cloud Run scale-to-zero로 인한 cold start 영향 모니터링
- 사이트 접근 불가 시 빠른 감지

**참고**:
- [UptimeRobot API](https://uptimerobot.com/api/) (무료 50개 모니터)
- [BetterStack (Better Uptime) API](https://betterstack.com/docs/uptime/api/getting-started/)
- 무료 티어로 충분한 수준의 모니터링 가능

---

## 구현 우선순위 제안

| 순위 | 항목 | 대시보드 | 난이도 | 이유 |
|------|------|---------|--------|------|
| 1 | Google Business Profile | Admin | 중 | 핵심 신뢰 신호, Place ID 보유 |
| 2 | GitHub API | Dev | 하 | 배포/CI 상태 즉시 파악, 구현 간단 |
| 3 | 검색광고 경쟁 분석 | Admin | 하 | 기존 API 확장, 추가 필드 활용 |
| 4 | Cloud Run 메트릭 | Dev | 중 | Admin SDK 보유, 서버 상태 중요 |
| 5 | 도메인/SSL 만료 | Dev | 하 | 구현 간단, 운영 안정성 |
| 6 | 의존성 보안 취약점 | Dev | 하 | 빌드 타임 통합 가능 |
| 7 | Uptime 모니터링 | Dev | 하 | 무료 서비스 활용 |
| 8 | 네이버 플레이스 리뷰 | Admin | 고 | 공식 API 제한적 |
| 9 | SNS 통계 | Admin | 중 | SNS 채널 활성화 후 진행 |

---

## 공통 구현 패턴

현재 프로젝트의 API 패턴을 따름:

- **API Route**: `app/api/admin/` 또는 `app/api/dev/` 하위에 엔드포인트 추가
- **인증**: `app/api/admin/_lib/auth.ts`의 Firebase Admin ID 토큰 검증
- **캐싱**: `app/api/admin/_lib/cache.ts`의 `unstable_cache` 래퍼 + TTL 상수
- **클라이언트**: `lib/` 하위에 API 클라이언트 모듈 추가
- **환경변수**: `apphosting.yaml` + Cloud Secret Manager, 로컬은 `.env.local`
- **UI**: 해당 탭 컴포넌트에서 `useAdminApi` 훅으로 데이터 페칭
