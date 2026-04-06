import Link from 'next/link';
import { ArrowLeft, Bot, Database, FileText, GitBranch, LineChart, ShieldCheck } from 'lucide-react';
import { AdminActionLink, AdminPill, AdminSurface } from '@/components/admin/AdminChrome';

const SECTIONS = [
  {
    title: '1. 무엇을 기반으로 추천하나',
    icon: Database,
    bullets: [
      'Naver DataLab 검색 트렌드: 카테고리/서브그룹별 상대 지수 추이',
      'Naver SearchAd 검색량: 월간 절대 검색량 보정',
      '현재 발행된 블로그 포스트: 주제별 existingPostCount 계산',
      '치료 페이지/FAQ 정의 데이터: lib/treatments.ts, 키워드 taxonomy 기반 매핑',
    ],
  },
  {
    title: '2. 어떻게 점수를 계산하나',
    icon: LineChart,
    bullets: [
      'gapScore: 검색량 + 콘텐츠 부족도 + 트렌드 보너스를 합산해 새 글 필요도를 계산',
      'pageUpdateScore: 검색 의도, 검색량, FAQ 커버리지 부족, 추세를 합산해 페이지 보강 우선순위를 계산',
      'businessValue: 비용/보험/기간/대상/추천 등 전환 가치가 높은 키워드에 higher weight 부여',
      'segment/seasonality: device/gender/ages 필터와 장기 월별 패턴으로 모멘텀 힌트를 계산',
    ],
  },
  {
    title: '3. 액션 타입은 어떻게 정하나',
    icon: GitBranch,
    bullets: [
      '정보형 + 포스트 부족 → new-post',
      '비교/검토형 또는 pageUpdateScore 높음 → update-service-page',
      '질문성 키워드 강함 → expand-faq',
      '전환형 + 모멘텀 강함 → strengthen-cta',
      '계절성 키워드 포함 → seasonal-campaign',
    ],
  },
  {
    title: '4. 자동 생성 브리프는 어떻게 만들어지나',
    icon: FileText,
    bullets: [
      '블로그 브리프: 대표 키워드, 검색 의도, 독자 유형, outline, meta description, CTA를 템플릿으로 생성',
      '페이지 브리프: hero/supporting copy, recommended blocks, FAQ 보강 질문, CTA, sourceFiles, checklist 생성',
      '브리프 목록은 overview API 응답 시점마다 다시 계산되며 별도 DB 저장은 하지 않음',
      '브리프에서 버튼을 누른 순간 sessionStorage에 스냅샷을 저장해 handoff함',
    ],
  },
  {
    title: '5. AI와의 관계',
    icon: Bot,
    bullets: [
      '현재 추천 엔진은 AI 호출 없이 동작하는 규칙 기반 시스템',
      '빠르고 비용이 없고, 같은 입력에는 같은 출력이 나오는 것이 장점',
      '따라서 실시간 추천은 deterministic하며 관리자 새로고침/기간 변경 시 재계산됨',
      '향후 원하면 이 브리프를 AI 초안 생성기로 넘기는 구조로 확장 가능',
    ],
  },
  {
    title: '6. 해석 시 주의점',
    icon: ShieldCheck,
    bullets: [
      'DataLab 값은 절대 검색량이 아니라 상대 지수이므로 market size처럼 읽으면 안 됨',
      'segment/seasonality 카드는 힌트이며, 실제 전환 판단은 Search Console/GA4와 함께 봐야 함',
      '브리프는 초안이므로 의료 표현, 비용 표현, 과장 문구는 사람이 최종 검수해야 함',
      '페이지 개편 워크노트는 자동 수정이 아니라 코드 수정 handoff를 위한 문서임',
    ],
  },
];

export default function AdminContentStrategyRulesPage() {
  return (
    <div className="space-y-6">
      <AdminSurface tone="white" className="rounded-3xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <AdminPill tone="white">추천 원리 문서</AdminPill>
            <h1 className="mt-3 text-2xl font-bold text-[var(--foreground)]">규칙 기반 실시간 추천 원리</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
              관리자 전략 화면의 갭 점수, 실행 추천, 자동 생성 브리프, 페이지 개편 워크노트가 어떤 데이터와 규칙으로 만들어지는지 정리한 운영 문서입니다.
            </p>
          </div>
          <AdminActionLink tone="dark" href="/admin/content/strategy">
            <ArrowLeft className="h-4 w-4" />
            전략 화면으로 돌아가기
          </AdminActionLink>
        </div>
      </AdminSurface>

      <div className="grid gap-4 xl:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <AdminSurface key={section.title} tone="white" className="rounded-3xl p-6">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-lg font-bold text-[var(--foreground)]">{section.title}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </AdminSurface>
          );
        })}
      </div>

      <AdminSurface tone="white" className="rounded-3xl p-6">
        <h2 className="text-lg font-bold text-[var(--foreground)]">운영자가 기억하면 좋은 한 줄</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">
          지금 시스템은 <strong className="text-[var(--foreground)]">데이터 기반 규칙 추천</strong>이고,
          AI는 아직 초안 생성에 자동 연결되지 않았습니다. 따라서 빠르고 일관되지만,
          최종 문구와 의료 표현은 반드시 사람이 검수해야 합니다.
        </p>
        <div className="mt-4">
          <Link href="/admin/content/strategy" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
            전략 화면에서 실제 추천 결과 다시 보기
          </Link>
        </div>
      </AdminSurface>
    </div>
  );
}
