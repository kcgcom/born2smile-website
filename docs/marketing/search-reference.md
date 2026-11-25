# 서울본치과 검색 참고

- 병원명·연락처·진료시간은 [코드 기본값](../../lib/constants.ts)과 [운영 설정 적용 경로](../../lib/site-config-supabase.ts)를 함께 확인한다. 홈페이지·상담 안내와 Google·네이버 프로필이나 AI 답변을 대조할 때 운영 진료시간과 임시 변경일을 기준으로 삼는다.
- 색인·대표 URL은 [검색 메타데이터](../../lib/seo.ts), [사이트맵](../../app/sitemap.ts), [robots](../../app/robots.ts), [구조화 데이터](../../lib/jsonld.ts)에서 확인한다. Google 색인 검사와 검색 성과는 각각 `/admin/analysis/indexing`, `/admin/analysis/search`에 있다.
- AI 답변이 병원 정보를 잘못 표시하면 해당 답변의 인용 URL과 공식 안내를 대조한다. 병원 정보와 공식 링크를 제공하는 [`/llms.txt` 경로](../../app/llms.txt/route.ts)와 [본문 생성 코드](../../lib/llms-text.ts)도 확인할 수 있다.
