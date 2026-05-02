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
    text: "크라운이 필요한 이유",
  },
  {
    type: "paragraph",
    text: "크라운은 충치나 파절로 치아 손상이 크거나, 신경치료 후 보호가 필요할 때 고려하는 대표적인 보철 치료입니다. 다만 모든 경우에 반드시 같은 방식의 크라운이 필요한 것은 아니며, 남은 치아 양과 깨진 범위에 따라 온레이나 다른 수복 방법이 더 적합할 수도 있습니다. 재료를 고를 때는 심미성만이 아니라 치아 위치, 씹는 힘, 이갈이 여부, 남은 치아 상태를 함께 봐야 합니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "한눈에 보는 비교표",
  },
  {
    type: "table",
    headers: ["비교 항목", "지르코니아", "골드", "PFM"],
    rows: [
      ["심미성", "치아 색에 가깝게 표현하기 좋음", "색이 눈에 띄어 전치부에는 제한적", "도재 색은 가능하지만 경계부 한계가 있을 수 있음"],
      ["강한 힘이 가는 부위", "어금니에서도 널리 고려", "기능 면에서 오랜 임상 경험", "충분히 가능하지만 도재 파절 가능성 설명 필요"],
      ["금속 노출 가능성", "없음", "재료 자체가 금색으로 보임", "잇몸 경계에서 금속 라인이 비칠 수 있음"],
      ["장기 임상 데이터", "좋은 결과가 많지만 세대별 차이 고려", "매우 풍부함", "매우 풍부함"],
      ["이런 경우 고려", "심미와 강도의 균형이 중요할 때", "어금니 기능과 장기 안정성을 우선할 때", "비용과 임상 경험을 함께 고려할 때"],
    ],
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/crown-material-comparison-chart.svg",
    alt: "지르코니아, 골드, PFM 크라운 재료를 심미성, 강도, 금속 노출 가능성, 장기 임상 데이터 기준으로 비교한 표",
    caption: "수명 숫자 하나보다 심미성, 기능, 금속 노출 가능성, 장기 임상 데이터의 균형을 함께 보는 것이 더 중요합니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "지르코니아 크라운",
  },
  {
    type: "paragraph",
    text: "지르코니아는 현재 임상에서 널리 사용되는 크라운 재료 중 하나입니다. 치아 색에 가깝게 제작할 수 있고 강도도 높아 앞니와 어금니 모두에서 고려됩니다. 금속이 드러나지 않아 심미적으로 유리한 경우가 많고, 생체 적합성도 좋은 편입니다. 다만 지르코니아도 종류와 제작 방식에 따라 투명도와 강도가 달라지므로, 전치부 심미와 구치부 기능 중 무엇을 더 우선할지 설명을 듣고 선택하는 것이 좋습니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "골드 크라운",
  },
  {
    type: "paragraph",
    text: "골드 크라운은 장기 임상 데이터가 풍부한 재료로, 특히 어금니처럼 강한 힘을 받는 부위에서 오랫동안 안정적으로 사용돼 왔습니다. 적합도가 우수하고 반대 치아에 대한 마모 부담이 상대적으로 적은 편이라 기능적인 장점이 있습니다. 다만 색상이 눈에 띄기 때문에 심미성이 중요한 앞니보다는 어금니에서 더 자주 고려됩니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "PFM 크라운",
  },
  {
    type: "paragraph",
    text: "PFM은 금속 프레임 위에 도자기를 입힌 크라운으로, 오랫동안 널리 사용된 검증된 재료입니다. 강도와 심미성을 함께 고려할 수 있는 선택지이며 지금도 상황에 따라 충분히 사용할 수 있습니다. 다만 시간이 지나 잇몸이 내려가거나 치은이 얇은 경우에는 경계 부위에서 금속 라인이 비쳐 보이거나 어둡게 보일 수 있어, 앞니처럼 심미성이 중요한 부위에서는 이를 함께 고려해야 합니다.",
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/pfm-metal-line-explainer.svg",
    alt: "PFM 크라운의 금속 프레임과 도재층 구조, 그리고 잇몸 경계에서 금속 라인이 비칠 수 있는 상황을 설명한 그림",
    caption: "PFM의 심미 한계는 재료 자체의 실패라기보다, 전치부와 얇은 치은에서 경계부가 눈에 띌 수 있다는 점에 가깝습니다.",
  },
  {
    type: "heading",
    level: 2,
    text: "부위별로 보는 선택 기준",
  },
  {
    type: "paragraph",
    text: "앞니에서는 색과 투명도, 웃을 때 경계부가 얼마나 자연스러운지가 중요합니다. 어금니에서는 씹는 힘, 이갈이 여부, 남은 치아 양과 같은 기능적 조건을 더 중요하게 보는 경우가 많습니다. 골드는 기능적으로 유리한 경우가 많고, 지르코니아는 심미성과 강도의 균형을 고려할 때 좋은 선택지가 될 수 있습니다. PFM도 여전히 사용할 수 있는 재료이지만, 심미 영역에서는 금속 경계가 보일 가능성을 함께 설명드리는 것이 좋습니다.",
  },
  {
    type: "image",
    src: "/images/blog/prosthetics/crown-region-selection-guide.svg",
    alt: "앞니에서는 심미성을, 어금니에서는 교합력과 내구성을 더 중요하게 보는 크라운 선택 기준 안내 이미지",
    caption: "앞니와 어금니는 같은 재료라도 판단 기준이 다르므로, 위치별 설명을 듣고 선택하는 것이 좋습니다.",
  },
  {
    type: "list",
    style: "bullet",
    items: [
      "앞니라서 색과 투명도가 매우 중요한 경우",
      "어금니이고 씹는 힘이 강하거나 이갈이가 있는 경우",
      "남은 치아가 적어 파절 위험을 더 주의해야 하는 경우",
      "금속이 보이는 심미적 부담이 큰 경우",
      "예산과 유지관리 계획을 함께 고려해야 하는 경우",
    ],
  },
  {
    type: "heading",
    level: 2,
    text: "크라운을 오래 쓰려면 재료보다 관리도 중요합니다",
  },
  {
    type: "paragraph",
    text: "크라운의 예후는 재료 하나만으로 결정되지 않습니다. 치아 위치, 교합, 이갈이 여부, 남은 치질량, 제작 정밀도, 구강 위생 관리가 함께 영향을 줍니다. 올바른 칫솔질과 치실 또는 치간 관리, 그리고 개인 상태에 맞춘 정기 검진이 크라운을 오래 쓰는 데 중요합니다.",
  },
  {
    type: "faq",
    question: "보험이 적용되는 크라운 재료는 무엇인가요?",
    answer: "크라운의 보험 적용 여부는 재료 이름만으로 결정되지 않고, 치아 위치와 상태, 현재 적용 기준에 따라 달라질 수 있습니다. 실제 적용 여부는 진료 후 현재 기준으로 확인하는 것이 가장 정확합니다.",
  },
  {
    type: "faq",
    question: "크라운이 빠졌는데 어떻게 해야 하나요?",
    answer: "빠진 크라운은 버리지 말고 가져오세요. 상태가 좋으면 재부착이 가능한 경우도 있습니다. 다만 임시 접착제로 임의로 붙이는 것은 맞물림을 더 어긋나게 할 수 있으니, 치아가 노출된 상태라면 자극적인 음식은 피하고 가능한 한 빨리 치과에서 확인받는 것이 좋습니다.",
  },
  {
    type: "relatedLinks",
    items: [
      {
        href: "/blog/prosthetics/laminate-veneer-guide",
        title: "라미네이트, 치아를 많이 깎나요?",
        description: "전치부 심미 보철에서 삭제량과 재료 선택을 함께 이해하고 싶다면 이어서 읽어보세요.",
      },
      {
        href: "/blog/prosthetics/after-crown-prosthetic-care",
        title: "크라운 씌웠는데 불편해요",
        description: "장착 직후 적응 과정과 다시 확인이 필요한 신호를 정리한 글입니다.",
      },
      {
        href: "/blog/prosthetics/prosthetic-adjustment-period-guide",
        title: "보철 후 이물감, 언제까지 적응하면 될까요?",
        description: "보철 전반의 적응 기간과 조정이 필요한 시점을 확인할 수 있습니다.",
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
    excerpt: "크라운 재료는 수명 숫자 하나보다 심미성, 강도, 금속 노출 가능성, 장기 임상 데이터, 치아 위치를 함께 보고 선택하는 것이 중요합니다. 지르코니아, 골드, PFM의 차이와 선택 기준을 비교해 정리했습니다.",
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
