import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { BlogBlock } from "../lib/blog/types";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const slug = "crown-material-comparison";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const blocks: BlogBlock[] = [
  {
    type: "heading",
    level: 2,
    text: "수명만 보고 고르면 놓치기 쉬운 기준",
  },
  {
    type: "paragraph",
    text: "크라운 상담을 받으면 “지르코니아 크라운 수명이 더 긴가요?”, “골드크라운 수명이 더 오래 가나요?”를 많이 물어보세요. 실제로 많이 궁금해하시는 부분입니다. 그런데 진료실에서는 재료 이름만 보고 수명을 단정하지는 않아요. 앞니인지 어금니인지, 심미를 얼마나 중요하게 생각하는지, 씹는 힘이 센 편인지, 이갈이가 있는지, 남은 치아가 얼마나 튼튼한지 같은 조건을 먼저 함께 봅니다.",
  },
  {
    type: "paragraph",
    text: "그래서 이 글은 많이 검색하시는 수명 질문에서 출발하되, 결국 내 치아 위치와 생활 습관에 맞는 재료를 이해하는 쪽으로 정리해보려고 합니다. 단순히 오래 가는 순위만 보는 것보다, 어떤 상황에서 어떤 재료가 더 유리한지까지 함께 보셔야 실제 선택에 더 도움이 됩니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "크라운 재료별 수명과 특징 비교표",
  },
  {
    type: "table",
    headers: ["비교 항목", "지르코니아", "골드", "PFM"],
    rows: [
      ["먼저 떠올릴 장점", "심미와 강도의 균형", "기능과 장기 안정성", "검증된 선택지와 비용 고려"],
      ["앞니에서", "색과 질감을 맞추기 유리한 편", "심미 부담이 커 제한적", "경계부 심미 설명이 필요할 수 있음"],
      ["어금니에서", "널리 고려되는 재료", "오랜 임상 경험이 강점", "사용 가능하지만 도재 파절 가능성 설명 필요"],
      ["금속이 드러나는가", "아니오", "재료 색이 그대로 보임", "잇몸 경계에서 비칠 수 있음"],
      ["이런 분에게 많이 거론", "보이는 부위와 기능을 함께 보는 경우", "씹는 힘과 마모 부담을 중요하게 보는 경우", "심미보다 실용성과 검증된 구조를 함께 보는 경우"],
    ],
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/crown-material-comparison-chart.svg",
    alt: "지르코니아, 골드, PFM 세 가지 크라운 재료를 각각의 성격에 맞게 부드러운 일러스트로 보여주는 이미지",
    caption: "환자분이 보기에는 재료 이름이 먼저 보이지만, 실제 선택은 위치와 교합, 심미 요구를 함께 보며 이루어집니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "앞니와 어금니는 판단 기준이 다릅니다",
  },
  {
    type: "paragraph",
    text: "앞니는 말할 때와 웃을 때 바로 보이는 위치라서 색, 투명도, 잇몸과 맞닿는 경계가 자연스러운지가 중요합니다. 반대로 어금니는 씹는 힘을 많이 받고, 이갈이가 있으면 하중도 더 커집니다. 그래서 앞니에서는 심미 쪽 기준이 더 앞에 오고, 어금니에서는 기능과 내구성 쪽 기준이 더 앞에 오는 경우가 많아요. 같은 재료라도 위치가 바뀌면 평가 순서가 달라지는 이유입니다.",
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/crown-region-selection-guide.svg",
    alt: "앞니와 어금니를 나눠 각각 심미성과 기능을 다르게 보는 이유를 부드러운 치아 일러스트로 설명한 이미지",
    caption: "앞니는 ‘보이는 느낌’, 어금니는 ‘버티는 힘’의 비중이 더 큽니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "지르코니아는 어떤 경우에 많이 고를까요?",
  },
  {
    type: "paragraph",
    text: "지르코니아는 심미와 강도를 함께 보려는 경우에 자주 이야기되는 재료입니다. 치아 색에 가깝게 제작할 수 있고 금속이 드러나지 않기 때문에, 보이는 부위에서 심미 부담이 적은 편이에요. 동시에 어금니에서도 널리 고려될 만큼 강도 측면의 장점이 있습니다. 다만 모든 지르코니아가 같은 성격은 아니어서, 투명도가 더 중요한지 기능을 더 우선하는지에 따라 선택 방향이 달라질 수 있습니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "골드는 왜 아직도 좋은 선택지일까요?",
  },
  {
    type: "paragraph",
    text: "골드 크라운은 오래된 재료라서 구식처럼 느껴질 수 있지만, 기능 면에서는 지금도 강점이 분명합니다. 특히 어금니처럼 힘을 많이 받는 부위에서는 장기 임상 경험이 풍부하고, 맞물리는 치아와의 관계를 중요하게 보는 분에게 현실적인 선택지가 될 수 있어요. 대신 색이 그대로 보이기 때문에 심미를 중요하게 보는 앞니에는 잘 쓰지 않습니다. 결국 골드는 ‘예뻐 보이는 재료’라기보다 ‘잘 버티는 쪽에 무게가 있는 재료’에 가깝습니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "PFM은 왜 여전히 설명할 가치가 있을까요?",
  },
  {
    type: "paragraph",
    text: "PFM은 금속 프레임 위에 도재를 입힌 구조라서, 한동안 가장 널리 쓰이던 크라운 중 하나였습니다. 지금도 충분히 사용할 수 있는 재료이고, 실제로는 여전히 검증된 선택지예요. 다만 앞니처럼 잇몸 경계가 많이 보이는 위치에서는 시간이 지나 경계부가 어둡게 보이거나 금속 라인이 비칠 수 있다는 설명이 필요합니다. 그래서 PFM은 ‘나쁜 재료’라기보다 ‘어디에 쓰느냐에 따라 장단점 설명이 더 중요한 재료’라고 이해하시면 좋습니다.",
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/pfm-metal-line-explainer.svg",
    alt: "PFM 구조와 앞니에서 경계부 심미 설명이 필요한 이유를 보여주는 차분한 치아 단면 일러스트",
    caption: "PFM은 구조상 설명이 필요한 포인트가 분명합니다. 특히 앞니처럼 많이 보이는 부위에서는 경계부 심미를 함께 봐야 합니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "실제로는 이런 상황에서 선택이 갈립니다",
  },
  {
    type: "list",
    style: "bullet",
    items: [
      "앞니라서 색과 투명도가 우선인 경우",
      "어금니이고 씹는 힘이 강하거나 이갈이가 있는 경우",
      "남은 치아가 적어 파절 위험을 더 신중히 보는 경우",
      "웃을 때 잇몸과 경계가 많이 보이는 경우",
      "예산과 유지 기간을 함께 고려해야 하는 경우",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "크라운을 오래 쓰는 데 더 중요한 것",
  },
  {
    type: "paragraph",
    text: "많은 분들이 수명 숫자를 먼저 검색하시지만, 실제 예후는 재료 이름 하나로 결정되지 않습니다. 치아 위치, 남은 치아량, 교합, 이갈이 여부, 제작 정밀도, 그리고 장착 후 관리가 함께 작용해요. 같은 재료라도 관리가 잘 되면 오래 쓰고, 반대로 교합 문제나 위생 관리가 안 되면 재치료 시점이 빨라질 수 있습니다. 그래서 어떤 재료를 쓰든 장착 후 불편감이 없는지, 치실이 잘 들어가는지, 정기 검진에서 경계부 상태가 안정적인지를 확인하는 과정이 중요합니다.",
  },
  {
    type: "paragraph",
    text: "정리하면, “무슨 재료가 제일 오래 가나요?”보다 “내 위치와 습관에 어떤 재료가 더 잘 맞나요?”라고 질문하는 편이 실제 상담에 더 가깝습니다. 그 답은 재료 이름 하나보다 치아 위치와 교합, 생활 습관을 함께 봐야 더 정확해집니다.",
  },
  {
    type: "faq",
    question: "지르코니아 크라운 수명은 어느 정도인가요?",
    answer: "지르코니아 크라운은 잘 관리하면 오래 사용하는 경우가 많습니다. 다만 실제 수명은 재료 이름 하나보다 치아 위치, 교합, 이갈이 여부, 남은 치아 상태, 장착 후 관리에 따라 달라질 수 있어요. 그래서 숫자 하나를 외우기보다 내 치아 조건에서 어떤 방식으로 쓰이느냐를 함께 보는 것이 더 중요합니다.",
  },
  {
    type: "faq",
    question: "골드크라운 수명이 더 오래 가는 편인가요?",
    answer: "골드크라운은 장기 임상 경험이 풍부한 재료로, 오래 사용하는 경우가 많은 편입니다. 다만 실제 사용 기간은 어금니인지 여부, 씹는 힘, 반대 치아와의 교합, 위생 관리 상태에 따라 달라질 수 있습니다. 특히 심미보다 기능과 장기 안정성을 중요하게 볼 때 많이 거론되는 재료입니다.",
  },
  {
    type: "faq",
    question: "보험이 적용되는 크라운 재료는 무엇인가요?",
    answer: "크라운의 보험 적용 여부는 재료 이름만으로 정해지지 않습니다. 치아 위치와 상태, 현재 급여 기준에 따라 달라질 수 있어요. 그래서 “이 재료는 무조건 보험이 된다”기보다, 진단 후 지금 기준으로 확인하는 것이 가장 정확합니다.",
  },
  {
    type: "faq",
    question: "크라운이 빠졌는데 집에서 다시 끼워도 되나요?",
    answer: "빠진 크라운은 버리지 말고 가져오시는 것이 좋습니다. 상태가 괜찮으면 다시 사용할 수 있는 경우도 있어요. 다만 집에서 임시 접착제로 붙이면 맞물림이 어긋나거나 치아 상태를 더 확인하기 어려워질 수 있으니, 가능한 한 빨리 치과에서 상태를 보는 것이 안전합니다.",
  },
  {
    type: "relatedLinks",
    items: [
      {
        href: "/blog/prosthetics/laminate-veneer-guide",
        title: "라미네이트, 치아를 많이 깎나요?",
        description: "앞니 심미를 중요하게 볼 때 어떤 선택지가 있는지 함께 이해할 수 있습니다.",
      },
      {
        href: "/blog/prosthetics/after-crown-prosthetic-care",
        title: "크라운 씌웠는데 불편해요",
        description: "장착 후 높게 물리거나 어색할 때 어떤 경우에 다시 확인해야 하는지 정리한 글입니다.",
      },
      {
        href: "/blog/prosthetics/prosthetic-adjustment-period-guide",
        title: "보철 후 이물감, 언제까지 적응하면 될까요?",
        description: "새 보철 전반에서 나타나는 적응 과정과 조정이 필요한 신호를 볼 수 있습니다.",
      },
    ],
  },
];

async function main() {
  const { data: post, error: fetchError } = await supabase
    .from("blog_posts")
    .select("slug, title, subtitle, excerpt, category, published")
    .eq("slug", slug)
    .single();

  if (fetchError || !post) {
    console.error("포스트 조회 실패:", fetchError);
    process.exit(1);
  }

  const payload = {
    title: "지르코니아 크라운 수명과 골드크라운 수명, 무엇이 더 오래 갈까요?",
    subtitle: "PFM까지 포함해 크라운 재료별 수명·심미성·기능 차이를 함께 보는 비교 가이드",
    excerpt: "지르코니아 크라운 수명과 골드크라운 수명 중 무엇이 더 오래 갈지 궁금하신가요? 실제로는 재료 이름만으로 결정되지 않고, 앞니·어금니 위치, 심미성, 기능, 교합 조건을 함께 봐야 합니다. PFM까지 포함해 크라운 재료별 수명과 선택 기준을 환자 관점에서 정리했습니다.",
    content: blocks,
    date_modified: "2026-05-02",
  };

  const { error: updateError } = await supabase
    .from("blog_posts")
    .update(payload)
    .eq("slug", slug);

  if (updateError) {
    console.error("업데이트 실패:", updateError);
    process.exit(1);
  }

  console.log(`✓ ${slug} 포스트 업데이트 완료`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
