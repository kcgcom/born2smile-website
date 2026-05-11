export interface KeyFinding {
  stat: string;       // 핵심 수치 (예: "94%", "6배")
  label: string;      // 수치 설명
  context?: string;   // 부연 설명
}

export interface ResearchPaper {
  id: string;
  title: string;           // 원문 제목
  titleKo: string;         // 한국어 제목
  journal: string;         // 저널명
  year: number;
  sampleSize?: string;     // 연구 대상 규모
  followUpPeriod?: string; // 추적 기간
  keyFindings: KeyFinding[];
  summary: string;         // 한국어 요약
  clinicalNote?: string;   // 임상적 시사점
  pubmedUrl: string;       // 원문 링크
}

export interface ResearchPage {
  slug: string;
  title: string;           // 페이지 제목 (한국어)
  subtitle: string;
  description: string;     // SEO meta description
  hubSummary?: string;     // research 허브 카드 설명
  hubHighlightStat?: string;
  hubHighlightLabel?: string;
  hubHighlightContext?: string;
  category: string;        // "보존치료" | "임플란트" | ...
  papers: ResearchPaper[];
  relatedBlogSlugs: { category: string; slug: string; title: string }[];
}
