/**
 * 선별된 15개 포스트에 FAQ 블록 2개씩 추가하는 스크립트
 * 실행: npx tsx scripts/add-blog-faq.ts
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// FAQ 블록 타입
interface FaqBlock {
  type: "faq";
  question: string;
  answer: string;
}

// 포스트별 FAQ 정의
const FAQ_MAP: Record<string, FaqBlock[]> = {
  "after-crown-prosthetic-care": [
    {
      type: "faq",
      question: "크라운 씌운 후 통증은 얼마나 지속되나요?",
      answer:
        "대부분의 경우 1~2주 이내에 적응됩니다. 일시적인 이물감이나 가벼운 시림은 정상 반응이에요. 2주 이상 지속되거나 깨물 때 통증이 심해진다면 교합 조정이 필요할 수 있으니 내원해 주세요.",
    },
    {
      type: "faq",
      question: "크라운 장착 후 식사는 언제부터 가능한가요?",
      answer:
        "최종 크라운 장착 당일은 가급적 반대편으로 씹는 것이 좋고, 다음 날부터는 일반적인 식사가 가능합니다. 처음 며칠은 너무 딱딱하거나 질긴 음식은 피해주세요.",
    },
  ],

  "denture-vs-implant": [
    {
      type: "faq",
      question: "나이가 많아도 임플란트 수술이 가능한가요?",
      answer:
        "나이 자체보다는 전신 건강 상태와 잇몸뼈 상태가 더 중요합니다. 혈압·당뇨 등 만성질환이 있어도 잘 조절되고 있다면 임플란트가 가능한 경우가 많아요. 정확한 판단은 검진 후 결정됩니다.",
    },
    {
      type: "faq",
      question: "틀니는 매일 빼서 보관해야 하나요?",
      answer:
        "네, 자는 동안에는 빼서 물 또는 틀니 세정제에 보관하는 것이 기본입니다. 항상 끼고 있으면 잇몸이 눌려 상하고 틀니 수명도 짧아질 수 있어요.",
    },
  ],

  "orthodontic-diet-guide": [
    {
      type: "faq",
      question: "투명교정 중에는 물도 빼고 마셔야 하나요?",
      answer:
        "찬물은 장치를 낀 채로 마셔도 됩니다. 하지만 커피, 주스, 탄산음료 등은 장치를 착색시키거나 충치 위험을 높이므로 빼고 드세요.",
    },
    {
      type: "faq",
      question: "교정 중 식사 후 바로 양치하기 어려울 때는 어떻게 하나요?",
      answer:
        "가능하면 식사 30분 이내에 양치하는 것이 좋지만, 어렵다면 물로 충분히 헹궈내는 것도 도움이 됩니다. 치간칫솔로 장치 사이 음식물을 제거하고 귀가 후 꼼꼼히 닦아주세요.",
    },
  ],

  "laminate-veneer-guide": [
    {
      type: "faq",
      question: "라미네이트 시술 후 얼마나 오래 쓸 수 있나요?",
      answer:
        "관리에 따라 다르지만 보통 10~15년 정도를 기대할 수 있어요. 이갈이나 딱딱한 음식을 앞니로 깨무는 습관이 있으면 수명이 짧아질 수 있습니다.",
    },
    {
      type: "faq",
      question: "라미네이트 후 치아가 시릴 수 있나요?",
      answer:
        "법랑질을 얇게 삭제하기 때문에 시술 직후 일시적인 시림이 생길 수 있어요. 대부분 1~2주 안에 가라앉지만, 지속되면 진료가 필요합니다.",
    },
  ],

  "retainer-after-orthodontics": [
    {
      type: "faq",
      question: "유지장치를 끼지 않으면 치아가 얼마나 빨리 돌아오나요?",
      answer:
        "교정 직후가 가장 움직임이 활발합니다. 6개월 안에 착용을 중단하면 눈에 띄게 돌아오는 경우가 많아요. 특히 앞니 틈새나 덧니 자리는 빠르게 재발할 수 있습니다.",
    },
    {
      type: "faq",
      question: "유지장치를 분실했는데 당장 치과에 가야 하나요?",
      answer:
        "며칠 안에 내원하시는 게 좋습니다. 교정 직후라면 특히 중요해요. 분실 기간이 길어질수록 새 장치가 맞지 않을 수 있고, 추가 조정이 필요할 수 있습니다.",
    },
  ],

  "children-malocclusion-guide": [
    {
      type: "faq",
      question: "유치가 빠지기 전에 교정을 시작해도 되나요?",
      answer:
        "네, 경우에 따라 유치가 남아 있는 시기에 예방 교정을 진행하기도 합니다. 턱 성장 유도나 나쁜 습관 교정이 목적일 때는 유치 시기가 오히려 효과적일 수 있어요.",
    },
    {
      type: "faq",
      question: "아이가 손가락을 자주 빠는데 치아에 영향을 주나요?",
      answer:
        "만 4~5세 이후에도 지속되는 손가락 빨기는 앞니 돌출이나 개방 교합을 유발할 수 있습니다. 일찍 습관을 교정하면 이후 교정 치료 부담을 줄일 수 있어요.",
    },
  ],

  "clear-vs-bracket-orthodontics": [
    {
      type: "faq",
      question: "투명교정이 브라켓보다 치료 기간이 더 길어지나요?",
      answer:
        "케이스에 따라 다릅니다. 단순한 경우라면 비슷하거나 오히려 빠를 수 있어요. 복잡한 치아 이동이 필요한 경우는 브라켓이 유리한 경우도 있습니다. 치료 계획 단계에서 비교해보는 것이 정확해요.",
    },
    {
      type: "faq",
      question: "투명교정 중 자는 동안에도 장치를 껴야 하나요?",
      answer:
        "네, 수면 중에도 착용해야 합니다. 하루 20~22시간 착용이 기본이므로 자는 시간을 활용해야 착용 시간을 채울 수 있어요. 빼고 자면 그만큼 치료 효과가 떨어집니다.",
    },
  ],

  "crown-material-comparison": [
    {
      type: "faq",
      question: "보험이 적용되는 크라운 재료는 무엇인가요?",
      answer:
        "금속 크라운과 레진(일부 조건) 등이 보험 적용 대상이 될 수 있습니다. 치아 위치와 상태에 따라 보험 기준이 달라지므로 진료 전 확인이 필요해요.",
    },
    {
      type: "faq",
      question: "크라운이 빠졌는데 어떻게 해야 하나요?",
      answer:
        "빠진 크라운은 버리지 말고 가져오세요. 재부착이 가능한 경우도 있습니다. 치아가 노출된 상태라 자극에 예민해질 수 있으니 빠른 내원을 권해드려요.",
    },
  ],

  "denture-care-tips": [
    {
      type: "faq",
      question: "틀니 세정제는 매일 사용해야 하나요?",
      answer:
        "매일 사용할 필요는 없고 주 2~3회로도 충분합니다. 매일 흐르는 물에 부드러운 칫솔로 세척하고, 정기적으로 세정제를 활용하는 것이 좋아요.",
    },
    {
      type: "faq",
      question: "틀니가 잇몸을 누르거나 아프면 어떻게 하나요?",
      answer:
        "처음 맞출 때는 잇몸이 적응하는 과정에서 욕창이나 상처가 생기기 쉬워요. 자가 조정은 틀니를 망가뜨릴 수 있으니, 통증이 지속되면 치과에서 교합 조정을 받으세요.",
    },
  ],

  "cracked-tooth-syndrome": [
    {
      type: "faq",
      question: "치아 균열은 X-ray로 발견되나요?",
      answer:
        "미세한 균열은 X-ray로 보이지 않는 경우가 많습니다. 씹을 때만 아프거나 특정 방향으로만 통증이 있다면 균열을 의심해볼 수 있어요. 직접 검사와 다양한 진단 방법이 필요합니다.",
    },
    {
      type: "faq",
      question: "치아에 금이 갔는데 당장 치료를 받아야 하나요?",
      answer:
        "균열의 깊이와 방향에 따라 달라집니다. 표면 균열이면 크라운으로 보호하는 것으로 충분하지만, 뿌리까지 진행됐다면 발치가 필요할 수도 있어요. 방치할수록 예후가 나빠지므로 빠른 진단을 권해드려요.",
    },
  ],

  "implant-vs-bridge-comparison": [
    {
      type: "faq",
      question: "임플란트와 브릿지 중 비용이 더 저렴한 것은 무엇인가요?",
      answer:
        "초기 비용은 브릿지가 낮지만, 수명과 유지 비용을 고려하면 장기적으로 임플란트가 유리한 경우가 많습니다. 브릿지는 10~15년 후 재제작이 필요할 수 있고, 양옆 치아도 함께 삭제해야 해요.",
    },
    {
      type: "faq",
      question: "빠진 치아를 그냥 두면 어떻게 되나요?",
      answer:
        "빈 자리가 생기면 양옆 치아가 쓰러지고 맞닿는 치아가 솟아오르면서 교합이 무너집니다. 잇몸뼈도 서서히 흡수되어 나중에 임플란트를 하게 될 경우 뼈이식이 필요해질 수 있어요.",
    },
  ],

  "cavity-stages-and-treatment": [
    {
      type: "faq",
      question: "충치가 생겼는데 아프지 않으면 그냥 둬도 되나요?",
      answer:
        "초기 충치는 통증이 없는 게 특징입니다. 아프지 않다고 괜찮은 게 아니라, 통증이 시작될 때는 이미 상당히 진행된 경우가 많아요. 정기 검진에서 조기 발견하는 것이 치료를 간단하게 끝내는 핵심입니다.",
    },
    {
      type: "faq",
      question: "충치 치료 후 다시 충치가 생길 수 있나요?",
      answer:
        "네, 치료 부위 주변에 이차 충치가 생길 수 있습니다. 레진이나 인레이 가장자리에서 발생하기 쉬워요. 정기 검진과 꼼꼼한 양치가 재발 예방의 핵심입니다.",
    },
  ],

  "root-canal-and-crown": [
    {
      type: "faq",
      question: "신경치료 후 크라운을 씌우지 않으면 어떻게 되나요?",
      answer:
        "신경치료한 치아는 수분과 영양 공급이 줄어 쉽게 부러집니다. 크라운 없이 사용하다 치아가 세로로 갈라지면 발치가 필요해질 수 있어요. 특히 어금니는 반드시 크라운으로 보호해야 합니다.",
    },
    {
      type: "faq",
      question: "신경치료가 왜 여러 번에 걸쳐 진행되나요?",
      answer:
        "치아 내부를 완전히 소독하고 염증을 가라앉히는 데 시간이 필요하기 때문입니다. 통증이 사라졌다고 중간에 치료를 중단하면 세균이 다시 번식해 재치료가 필요해질 수 있어요.",
    },
  ],

  "after-tooth-extraction-care": [
    {
      type: "faq",
      question: "발치 후 술과 담배는 언제부터 가능한가요?",
      answer:
        "최소 3일, 가능하면 1주일은 금연·금주를 권장합니다. 흡연은 혈관을 수축시켜 회복을 늦추고 드라이 소켓 위험을 높여요. 음주는 출혈과 부종을 악화시킬 수 있습니다.",
    },
    {
      type: "faq",
      question: "발치 부위 실밥은 언제 제거하나요?",
      answer:
        "봉합사를 사용한 경우 보통 7~10일 후 내원해서 제거합니다. 자연 흡수되는 실을 사용하는 경우도 있으니 담당 치과에서 확인하는 것이 정확해요.",
    },
  ],

  "clear-aligner-care-guide": [
    {
      type: "faq",
      question: "투명교정 장치를 잃어버리면 어떻게 하나요?",
      answer:
        "바로 치과에 연락하세요. 분실한 번호의 장치를 재발급받거나, 상황에 따라 이전 또는 다음 단계 장치를 임시로 사용하기도 합니다. 며칠이라도 방치하면 치아가 이동할 수 있어요.",
    },
    {
      type: "faq",
      question: "투명교정 장치가 착색됐을 때 세척 방법이 있나요?",
      answer:
        "미온수와 치간칫솔 또는 투명교정 전용 세정제로 세척하세요. 뜨거운 물은 장치를 변형시킬 수 있으니 금물이에요. 착색이 심하면 교체 시기를 앞당기는 것도 방법입니다.",
    },
  ],
};

async function run() {
  const slugs = Object.keys(FAQ_MAP);
  console.log(`\n📋 총 ${slugs.length}개 포스트에 FAQ 추가 시작\n`);

  let success = 0;
  let failed = 0;

  for (const slug of slugs) {
    // 현재 content 가져오기
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, content")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error || !data) {
      console.log(`❌ ${slug}: 조회 실패 — ${error?.message}`);
      failed++;
      continue;
    }

    const currentContent: unknown[] = Array.isArray(data.content) ? data.content : [];

    // 이미 FAQ 블록이 있으면 스킵
    if (currentContent.some((b: unknown) => (b as { type: string }).type === "faq")) {
      console.log(`⏭️  ${slug}: 이미 FAQ 있음, 스킵`);
      continue;
    }

    // relatedLinks 블록 앞에 FAQ 삽입 (없으면 맨 끝에 추가)
    const faqs = FAQ_MAP[slug];
    const relatedIdx = currentContent.findIndex(
      (b: unknown) => (b as { type: string }).type === "relatedLinks"
    );

    let newContent: unknown[];
    if (relatedIdx >= 0) {
      newContent = [
        ...currentContent.slice(0, relatedIdx),
        ...faqs,
        ...currentContent.slice(relatedIdx),
      ];
    } else {
      newContent = [...currentContent, ...faqs];
    }

    // 업데이트
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ content: newContent })
      .eq("slug", slug);

    if (updateError) {
      console.log(`❌ ${slug}: 업데이트 실패 — ${updateError.message}`);
      failed++;
    } else {
      console.log(`✅ ${slug}: FAQ ${faqs.length}개 추가 완료`);
      success++;
    }
  }

  console.log(`\n완료: ✅ ${success}개 성공, ❌ ${failed}개 실패`);
}

run().catch((e) => {
  console.error("실행 오류:", e);
  process.exit(1);
});
