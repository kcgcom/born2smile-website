// =============================================================
// 블로그 포스트 데이터
// 구강관리에 도움이 되는 건강 정보 중심으로 구성
// =============================================================

export interface BlogPost {
  id: number;
  slug: string;
  category: "구강관리" | "예방치료" | "치아상식" | "생활습관";
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
}

export const BLOG_CATEGORIES = [
  "전체",
  "구강관리",
  "예방치료",
  "치아상식",
  "생활습관",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    slug: "correct-brushing-method",
    category: "구강관리",
    title: "올바른 양치질 방법, 알고 계신가요?",
    excerpt:
      "매일 하는 양치질이지만 올바른 방법을 모르는 경우가 많습니다. 칫솔 각도 45도, 잇몸에서 치아 방향으로 쓸어내기 등 치과 전문의가 알려주는 올바른 양치법을 확인해 보세요.",
    date: "2026-02-10",
    readTime: "3분",
  },
  {
    id: 2,
    slug: "implant-aftercare-tips",
    category: "예방치료",
    title: "임플란트 후 관리법 5가지",
    excerpt:
      "임플란트 시술 후 올바른 관리가 수명을 결정합니다. 정기 검진, 올바른 양치법, 워터픽 사용법 등 임플란트를 오래 사용하기 위한 핵심 관리 방법을 소개합니다.",
    date: "2026-02-08",
    readTime: "4분",
  },
  {
    id: 3,
    slug: "children-dental-care",
    category: "구강관리",
    title: "우리 아이 첫 치과, 언제 가는 게 좋을까요?",
    excerpt:
      "아이의 유치가 나기 시작하면 치과 검진을 시작하는 것이 좋습니다. 첫 치과 방문 시기, 소아 불소 도포의 효과, 아이가 치과를 무서워하지 않게 하는 방법까지 알아봅니다.",
    date: "2026-02-05",
    readTime: "5분",
  },
  {
    id: 4,
    slug: "gum-disease-prevention",
    category: "예방치료",
    title: "잇몸이 붓고 피가 나요 — 잇몸 질환 초기 증상과 예방법",
    excerpt:
      "양치할 때 잇몸에서 피가 나거나 붓는 증상은 잇몸 질환의 초기 신호일 수 있습니다. 치은염과 치주염의 차이, 초기에 발견하고 관리하는 방법을 알아봅니다.",
    date: "2026-02-03",
    readTime: "4분",
  },
  {
    id: 5,
    slug: "food-for-dental-health",
    category: "생활습관",
    title: "치아 건강에 좋은 음식 vs 나쁜 음식",
    excerpt:
      "우유, 치즈, 녹차 등 치아를 보호하는 음식과 탄산음료, 끈적한 캔디 등 치아에 해로운 음식을 비교해 봅니다. 식습관만 바꿔도 충치 예방에 큰 도움이 됩니다.",
    date: "2026-01-29",
    readTime: "3분",
  },
  {
    id: 6,
    slug: "dental-floss-guide",
    category: "구강관리",
    title: "치실, 꼭 써야 하나요? 올바른 사용법 가이드",
    excerpt:
      "양치만으로는 치아 사이 음식물과 플라크를 완전히 제거할 수 없습니다. 치실과 치간칫솔의 올바른 사용법, 그리고 자신에게 맞는 제품을 고르는 방법을 안내합니다.",
    date: "2026-01-25",
    readTime: "3분",
  },
  {
    id: 7,
    slug: "teeth-sensitivity-causes",
    category: "치아상식",
    title: "찬물만 마셔도 시린 치아, 원인과 대처법",
    excerpt:
      "시린 이의 원인은 잇몸 퇴축, 법랑질 손상, 충치 등 다양합니다. 시린이 전용 치약의 효과, 병원에서 받을 수 있는 치료, 일상에서의 관리법을 함께 알아봅니다.",
    date: "2026-01-22",
    readTime: "4분",
  },
  {
    id: 8,
    slug: "scaling-myths-and-facts",
    category: "치아상식",
    title: "스케일링하면 이가 깎이나요? 흔한 오해와 진실",
    excerpt:
      "스케일링 후 이가 시리거나 벌어진 느낌이 드는 이유, 1년에 한 번 건강보험 적용 스케일링의 중요성 등 스케일링에 대한 흔한 오해와 정확한 정보를 정리했습니다.",
    date: "2026-01-18",
    readTime: "3분",
  },
  {
    id: 9,
    slug: "orthodontics-for-adults",
    category: "치아상식",
    title: "성인 교정, 늦지 않았을까? 궁금증 총정리",
    excerpt:
      "치아 교정은 성인이 되어도 가능합니다. 투명교정, 설측교정 등 다양한 옵션과 교정 기간, 비용, 일상생활에서의 주의사항을 정리했습니다.",
    date: "2026-01-14",
    readTime: "5분",
  },
  {
    id: 10,
    slug: "stress-and-teeth-grinding",
    category: "생활습관",
    title: "수면 중 이 갈기(이갈이), 방치하면 안 되는 이유",
    excerpt:
      "스트레스, 수면 자세, 교합 문제 등으로 발생하는 이갈이는 치아 마모, 턱관절 장애로 이어질 수 있습니다. 자가 진단법과 치과에서의 치료법을 소개합니다.",
    date: "2026-01-10",
    readTime: "4분",
  },
];
