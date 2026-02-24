# Environment Variables

로컬 개발: `.env.example` → `.env.local`로 복사하여 사용.
프로덕션: `apphosting.yaml`의 `env` 섹션 + Cloud Secret Manager로 관리.

## 변수 목록

| 변수 | 설명 | 필수 여부 |
|------|------|----------|
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | Kakao Maps JavaScript App Key | 지도 컴포넌트 필수 |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | Firestore 좋아요 + 관리자 인증 필수 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID (default: `seoul-born2smile`) | 필수 |
| `NEXT_PUBLIC_ADMIN_EMAILS` | 관리자 이메일 화이트리스트 (쉼표 구분, default: `kcgcom@gmail.com`) | 필수 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 서비스 계정 JSON key (로컬 개발 전용). 프로덕션은 Cloud Run ADC가 자동 인증. App Hosting SA에 GA4 뷰어 + SC 전체 권한 필요 | 로컬 전용 |
| `GA4_PROPERTY_ID` | Google Analytics 4 속성 ID (숫자만, 예: `525397980`) | 트래픽 탭 필수 |
| `SEARCH_CONSOLE_SITE_URL` | Search Console 사이트 URL (예: `sc-domain:born2smile.co.kr`) | 검색/SEO 탭 필수 |
| `NAVER_DATALAB_CLIENT_ID` | 네이버 DataLab API Client ID (미설정 시 섹션 숨김) | 선택 |
| `NAVER_DATALAB_CLIENT_SECRET` | 네이버 DataLab API Client Secret (Secret Manager) | DATALAB 사용 시 필수 |
| `NAVER_SEARCHAD_API_KEY` | 네이버 검색광고 API Key (절대 검색량 조회, 미설정 시 DataLab 상대값으로 폴백) | 선택 |
| `NAVER_SEARCHAD_SECRET_KEY` | 네이버 검색광고 API Secret Key (HMAC-SHA256 서명, Secret Manager) | SEARCHAD 사용 시 필수 |
| `NAVER_SEARCHAD_CUSTOMER_ID` | 네이버 검색광고 고객 ID | SEARCHAD 사용 시 필수 |
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API 키 (Cloud Console에서 API 키 생성 + PSI API 활성화) | 성능 탭 필수 |

## 네이버 검색광고 API 주의사항

- **키워드 공백 불가**: `hintKeywords` 파라미터는 공백 없는 키워드만 허용 (예: `임플란트비용`, NOT `임플란트 비용`). `admin-naver-searchad.ts`의 `normalizeKeyword()`가 자동 처리.
- **시간당 호출 제한**: API 레이트 리밋 있음. 순차 배치 호출(200ms 간격) + 24시간 `unstable_cache`로 보호.
- **환경변수 lazy 읽기**: Cloud Run 시크릿 주입 타이밍 이슈로 모듈 레벨 상수 대신 `getApiKey()` 등 lazy getter 사용. 시크릿에 trailing newline이 있을 수 있어 `.trim()` 필수.
- **HMAC 서명**: `{timestamp}.GET./keywordstool` 형식, SHA-256, Base64 인코딩.
