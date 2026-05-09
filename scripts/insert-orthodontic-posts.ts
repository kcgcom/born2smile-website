/**
 * 교정 관련 블로그 포스트 2편 삽입 (임시저장 상태)
 *
 * 1. partial-orthodontics-front-teeth — 앞니 부분교정, 전체 교정 대신 할 수 있을까요?
 * 2. orthodontic-relapse-retreatment — 교정했는데 왜 다시 틀어질까요?
 *
 * 실행: npx dotenv-cli -e .env.local -- npx tsx scripts/insert-orthodontic-posts.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(p: string) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────
// 포스트 1: 앞니 부분교정
// ─────────────────────────────────────────────
const post1 = {
  slug: "partial-orthodontics-front-teeth",
  title: "앞니 부분교정, 전체 교정 대신 할 수 있을까요?",
  subtitle: "적합한 케이스와 아닌 케이스를 먼저 구분해 드릴게요",
  excerpt:
    "앞니 몇 개만 고치고 싶은데 전체 교정까지 해야 하나 고민되시는 분들이 많아요. 부분교정이 가능한 케이스와 처음부터 전체 교정이 필요한 케이스는 어떻게 다른지, 장치 종류와 유지장치까지 함께 정리했습니다.",
  category: "orthodontics",
  tags: ["비교가이드"],
  published: false,
  content: [
    {
      type: "paragraph",
      text: "\"앞니 두세 개만 고치고 싶은데 전체 교정까지 해야 하나요?\" 상담에서 자주 듣는 질문이에요. 이미 교정을 한 번 마쳤는데 앞니 일부가 다시 틀어진 경우도 있고, 전체는 크게 문제없는데 앞니 몇 개가 신경 쓰인다는 분도 많아요.",
    },
    {
      type: "paragraph",
      text: "결론부터 말씀드리면, 전치부 부분교정이 가능한 케이스가 있고 처음부터 전체 교정이 필요한 케이스가 있어요. 둘을 구분하는 기준을 먼저 이해하면 상담에서 훨씬 수월해집니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "전치부 부분교정이란 무엇인가요?",
    },
    {
      type: "paragraph",
      text: "전치부 부분교정은 어금니는 그대로 두고 앞니(전치부) 6~8개 범위에만 교정장치를 달아 치아를 움직이는 방법이에요. 전체 교정보다 장치를 다는 치아 수가 적어 치료 기간이 짧고, 비용도 상대적으로 낮은 경우가 많습니다. 보통 6개월에서 1년 내외로 마무리되는 케이스가 많아요.",
    },
    {
      type: "paragraph",
      text: "다만 치료 기간이나 비용은 치아 이동량과 개인 상태에 따라 달라져서, \"부분교정이면 빠르고 저렴하다\"고 단정할 수는 없어요. 치아를 움직이는 메커니즘은 전체 교정과 동일하고, 골격 문제가 얽혀 있으면 부분교정만으로는 해결이 어려운 경우도 있습니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "부분교정이 잘 맞는 케이스는 어떤 경우인가요?",
    },
    {
      type: "paragraph",
      text: "부분교정이 좋은 결과를 내기 유리한 조건이 있어요.",
    },
    {
      type: "list",
      items: [
        "어금니 교합(윗니와 아랫니가 맞물리는 것)이 이미 안정적인 경우",
        "앞니 일부만 삐뚤거나 틈이 생긴 경우 (치아 이동량이 크지 않을 때)",
        "교정 후 앞니만 일부 후퇴(재발)된 경우",
        "회전이나 소폭 이동으로 목표를 달성할 수 있는 경우",
      ],
    },
    {
      type: "paragraph",
      text: "이미 전체 교정을 마친 뒤 앞니만 조금 틀어진 경우, 재교정 범위를 전치부로 한정할 수 있는 케이스가 많아요. 이 경우 부분교정이 합리적인 선택이 될 수 있습니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "부분교정만으로는 어려운 케이스도 있어요",
    },
    {
      type: "paragraph",
      text: "반대로 아래 상황에서는 부분교정으로 시작했다가 결국 전체 교정이 필요해지는 경우가 있어요. 처음부터 범위를 제대로 파악하고 시작하는 편이 더 효율적입니다.",
    },
    {
      type: "list",
      items: [
        "어금니 교합 자체가 틀어져 있는 경우 (앞니만 고쳐도 교합 문제가 남음)",
        "골격 차이(턱 위치)가 원인인 부정교합",
        "치아 이동량이 많아 발치가 필요한 경우",
        "앞니 공간을 만들기 위해 어금니를 먼저 이동해야 하는 경우",
      ],
    },
    {
      type: "callout",
      title: "실제 진료에서 자주 보는 오해",
      text: "라미네이트나 레진으로 앞니 모양을 바꾸는 것을 부분교정으로 오해하시는 경우가 있어요. 라미네이트와 레진은 치아를 삭제하거나 덧붙여 모양을 바꾸는 방법이고, 교정은 치아 위치 자체를 이동시키는 방법이라 목적이 달라요.",
    },
    {
      type: "heading",
      level: 2,
      text: "부분교정 장치는 어떤 걸 쓰나요?",
    },
    {
      type: "paragraph",
      text: "전치부 부분교정도 브래킷과 투명교정 두 방식으로 할 수 있어요. 앞니 부위에만 브래킷을 붙이는 방식이 전통적이고, 투명교정도 전치부 중심으로 계획을 잡을 수 있습니다.",
    },
    {
      type: "paragraph",
      text: "어떤 장치가 맞는지는 이동 방향과 양, 교합 상태에 따라 달라져요. 심미적으로 장치가 덜 보이길 원하신다면 투명교정 쪽이 유리하지만, 치아 이동의 정확도 면에서는 각 케이스별로 판단이 필요합니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "부분교정 후에도 유지장치가 필요한가요?",
    },
    {
      type: "paragraph",
      text: "네, 필요합니다. 전체 교정이든 부분교정이든, 치아를 움직인 뒤에는 새로운 위치에서 안정되는 시간이 필요해요. 유지장치 없이 두면 치아가 원래 위치로 돌아가려는 경향이 있어서, 부분교정 후에도 유지장치 착용이 권장됩니다.",
    },
    {
      type: "paragraph",
      text: "유지장치 종류와 착용 기간은 교정 방식이나 치아 이동 내용에 따라 달라질 수 있어요.",
    },
    {
      type: "heading",
      level: 2,
      text: "부분교정 상담 전에 확인하면 좋은 것들",
    },
    {
      type: "paragraph",
      text: "부분교정을 고려 중이라면 어금니 교합이 안정적인지, 이전에 교정을 한 경험이 있는지, 치아 이동량이 어느 정도인지를 검진으로 먼저 확인하는 것이 중요합니다. X-ray와 구강 스캔으로 치아 뿌리 위치와 잇몸뼈(치조골) 상태를 파악해야, 부분교정이 가능한 케이스인지 전체 교정이 필요한지 정확히 판단할 수 있거든요.",
    },
    {
      type: "paragraph",
      text: "서울본치과에서는 부분교정 상담 시 어금니 교합과 치아 이동량을 함께 확인한 뒤, 부분교정으로 목표를 달성할 수 있을지 솔직하게 말씀드리고 있어요.",
    },
    {
      type: "faq",
      items: [
        {
          question: "부분교정과 전체 교정, 비용 차이가 얼마나 나나요?",
          answer:
            "치아 이동 범위와 장치 종류, 치료 기간에 따라 달라져서 일률적으로 말씀드리기 어려워요. 부분교정이 범위가 작아 상대적으로 낮은 경우가 많지만, 치아 이동량이 많으면 기간과 비용이 전체 교정과 크게 차이 나지 않을 수도 있어요.",
        },
        {
          question: "앞니만 약간 벌어졌는데 부분교정으로 될까요?",
          answer:
            "치아 사이 벌어짐은 부분교정으로 닫을 수 있는 경우가 많아요. 다만 벌어진 원인이 혀 내밀기 습관이나 잇몸 질환(치주 질환)인 경우에는 원인을 함께 해결하지 않으면 재발할 수 있어서, 상태 확인이 먼저 필요합니다.",
        },
        {
          question: "부분교정도 발치가 필요할 수 있나요?",
          answer:
            "드물지만 앞니 공간이 부족해 이동이 어려운 경우에는 발치가 필요할 수도 있어요. 이런 케이스라면 전체 교정으로 계획을 바꾸는 편이 더 나은 경우도 있어서, 검진 후 범위를 함께 결정하는 것이 좋습니다.",
        },
      ],
    },
    {
      type: "relatedLinks",
      items: [
        {
          href: "/blog/orthodontics/clear-vs-bracket-orthodontics",
          title: "투명교정 vs 브라켓, 뭐가 맞을까?",
          description: "장치별 특징과 케이스별 선택 기준을 비교해 드려요.",
        },
        {
          href: "/blog/orthodontics/retainer-after-orthodontics",
          title: "교정 끝났는데 유지장치 꼭 해야 하나요?",
          description: "교정 후 치아가 다시 움직이지 않도록 유지장치의 역할을 설명해 드려요.",
        },
        {
          href: "/blog/orthodontics/orthodontic-extraction-guide",
          title: "교정할 때 치아를 꼭 빼야 하나요?",
          description: "발치 교정과 비발치 교정의 기준을 쉽게 설명해 드려요.",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// 포스트 2: 교정 후 재발·재교정
// ─────────────────────────────────────────────
const post2 = {
  slug: "orthodontic-relapse-retreatment",
  title: "교정했는데 왜 다시 틀어질까요?",
  subtitle: "후퇴 원인과 재교정 전에 확인할 것들",
  excerpt:
    "교정을 마쳤는데 몇 년 뒤 치아가 다시 틀어진 것 같다면, 그 원인이 궁금하실 거예요. 유지장치 문제만이 아니라 사랑니 맹출, 자연적인 노화도 후퇴에 영향을 줘요. 후퇴 원인과 재교정을 고려할 때 확인할 것들을 정리했습니다.",
  category: "orthodontics",
  tags: ["팩트체크"],
  published: false,
  content: [
    {
      type: "paragraph",
      text: "교정이 끝난 뒤 몇 년이 지나 거울을 보다가 \"예전보다 치아가 틀어진 것 같은데?\" 하는 느낌이 드는 경우가 있어요. 치료비도 적잖이 들었고 시간도 꽤 걸렸는데 다시 이래도 되나 싶은 마음, 충분히 이해가 가요.",
    },
    {
      type: "paragraph",
      text: "교정 후 치아가 다시 움직이는 것을 후퇴(재발)라고 해요. 후퇴는 드문 일이 아닙니다. 정도 차이는 있지만 교정 치료를 받은 분들 중 시간이 지나면서 치아 위치가 조금씩 변하는 경우는 상당히 많아요. 원인을 알면 대처가 달라집니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "교정 후 치아가 다시 움직이는 이유는 무엇인가요?",
    },
    {
      type: "paragraph",
      text: "교정은 잇몸뼈(치조골)에 힘을 가해 치아를 새 위치로 이동시키는 치료예요. 치료가 끝난 뒤 잇몸뼈가 새 위치에서 안정되려면 시간이 필요한데, 이 과정에서 원래 위치로 돌아가려는 힘이 작용합니다. 치주인대(치아와 잇몸뼈를 연결하는 인대)에 기억성이 있어서, 특히 치료 직후 유지장치를 착용하지 않으면 후퇴가 빠르게 진행될 수 있어요.",
    },
    {
      type: "heading",
      level: 2,
      text: "후퇴의 주요 원인 세 가지",
    },
    {
      type: "paragraph",
      text: "후퇴 원인은 크게 세 가지로 나눌 수 있어요.",
    },
    {
      type: "list",
      items: [
        "유지장치 미착용 또는 조기 중단: 교정 직후 가장 흔한 원인이에요. 유지장치를 빠르게 그만두면 치아가 원래 위치로 돌아가기 쉬워요.",
        "사랑니 맹출: 사랑니가 나면서 앞니 쪽으로 압력을 전달해 치아가 틀어지는 경우가 있어요. 교정 후 사랑니 상태를 지속적으로 확인하는 이유입니다.",
        "자연적인 노화: 나이가 들면서 잇몸뼈와 치주인대가 변화하고 교합도 조금씩 달라져요. 유지장치를 꾸준히 착용해도 아주 소폭의 변화는 시간이 지나면서 생길 수 있습니다.",
      ],
    },
    {
      type: "paragraph",
      text: "이 세 가지 중 유지장치 착용과 관련된 후퇴는 어느 정도 예방이 가능하지만, 사랑니 영향과 노화에 의한 변화는 완전히 막기 어려운 경우도 있어요.",
    },
    {
      type: "heading",
      level: 2,
      text: "유지장치를 잘 착용했는데도 틀어질 수 있나요?",
    },
    {
      type: "paragraph",
      text: "네, 있어요. 착탈식 유지장치를 잘 착용하다가도 착용을 점차 줄이는 과정에서 변화가 생기는 경우가 있고, 고정식 유지장치(앞니 뒤에 붙이는 와이어)가 탈락했는데 인지하지 못한 채 시간이 지나는 경우도 있어요.",
    },
    {
      type: "paragraph",
      text: "또한 교정 치료 범위 이외의 치아 변화(어금니 마모, 잇몸 변화)가 교합(윗니와 아랫니가 맞물리는 것)에 영향을 주어 앞니 위치가 간접적으로 바뀌는 경우도 있습니다. 이런 경우는 유지장치 문제가 아니라 전체 구강 상태 변화와 연결된 것이에요.",
    },
    {
      type: "heading",
      level: 2,
      text: "어느 정도 변한 경우 재교정을 생각해볼 수 있나요?",
    },
    {
      type: "paragraph",
      text: "후퇴 정도와 불편감에 따라 접근이 달라져요.",
    },
    {
      type: "list",
      items: [
        "소폭 변화 (눈에 잘 안 띄고 교합에 문제 없음): 유지장치를 다시 착용하거나 새로 제작해 더 이상의 진행을 막는 경우가 많아요.",
        "중간 정도 변화 (눈에 띄거나 교합이 불편한 경우): 전치부 부분교정이 선택지가 될 수 있어요.",
        "상당한 변화 또는 교합 문제 동반: 전체 교정이 필요한 케이스일 수 있어요. 이전 교정 자료(석고 모형, X-ray)가 남아 있으면 비교 판단에 도움이 됩니다.",
      ],
    },
    {
      type: "callout",
      title: "재교정 전에 먼저 확인할 것",
      text: "재교정 여부를 판단하기 전에, 고정식 유지장치가 붙어 있다면 탈락 여부를 먼저 확인하고, 사랑니 상태와 교합 변화를 함께 점검하는 것이 좋아요. 원인을 파악하지 않고 재교정을 시작하면 같은 문제가 반복될 수 있거든요.",
    },
    {
      type: "heading",
      level: 2,
      text: "재교정은 처음 교정과 어떻게 다른가요?",
    },
    {
      type: "paragraph",
      text: "이전에 교정을 받은 치아는 이미 한 번 이동한 경험이 있어서, 처음 교정과 치료 흐름이 조금 달라요. 이전 교정 자료(치아 이동 방향, 발치 여부 등)가 재교정 계획에 영향을 주고, 나이가 들면서 잇몸뼈 밀도가 변하면 치아 이동 반응이 예전과 다를 수 있습니다.",
    },
    {
      type: "paragraph",
      text: "그래서 재교정 전에 잇몸 상태와 잇몸뼈 상태를 점검하는 것이 처음 교정 때보다 더 중요해져요. 잇몸 질환(치주 질환)이 있는 상태에서 교정을 시작하면 치아와 잇몸뼈에 부담이 커질 수 있기 때문입니다.",
    },
    {
      type: "heading",
      level: 2,
      text: "재교정 후 다시 틀어지지 않으려면",
    },
    {
      type: "paragraph",
      text: "재교정을 마친 뒤에는 유지장치 착용을 처음 교정 때보다 조금 더 오래, 더 꾸준히 하는 편이 좋아요. 한 번 후퇴를 경험한 만큼 치아가 돌아가려는 힘이 있다는 걸 이미 알고 계시잖아요.",
    },
    {
      type: "paragraph",
      text: "사랑니가 남아 있다면 재교정 전후로 상태를 확인하고, 필요하면 발치 시점을 함께 조율하는 편이 좋습니다. 고정식 유지장치를 선택했다면 주기적으로 탈락 여부를 확인받는 것도 도움이 돼요.",
    },
    {
      type: "paragraph",
      text: "서울본치과에서는 재교정 상담 시 변화 원인을 먼저 파악한 뒤, 전체 교정이 필요한 케이스인지 부분교정으로 충분한지 솔직하게 말씀드리고 있어요.",
    },
    {
      type: "faq",
      items: [
        {
          question: "유지장치를 오래 안 꼈더니 틀어졌어요. 다시 끼면 돌아올까요?",
          answer:
            "변화 정도에 따라 달라요. 소폭 변화라면 새로 맞춘 유지장치를 꾸준히 착용해 더 이상의 진행을 막는 것이 목표가 되고, 이미 많이 틀어진 경우에는 유지장치만으로는 돌아오지 않아 재교정이 필요할 수 있어요. 현재 상태를 먼저 확인하는 것이 좋습니다.",
        },
        {
          question: "재교정 기간은 처음 교정보다 짧은가요?",
          answer:
            "변화 범위가 크지 않다면 처음보다 짧을 수 있어요. 하지만 치아 이동량과 잇몸뼈 상태에 따라 기간이 달라지기 때문에 검진 전에 일률적으로 말씀드리기 어렵습니다.",
        },
        {
          question: "교정 후 사랑니를 빼면 다시 틀어지는 것을 막을 수 있나요?",
          answer:
            "사랑니가 앞니 후퇴에 미치는 영향은 개인마다 달라요. 사랑니 맹출이 앞니에 압력을 주는 상황이라면 발치가 도움이 되는 경우도 있지만, 사랑니 제거가 후퇴를 완전히 막아주지는 않아요. 유지장치 착용이 가장 핵심입니다.",
        },
      ],
    },
    {
      type: "relatedLinks",
      items: [
        {
          href: "/blog/orthodontics/retainer-after-orthodontics",
          title: "교정 끝났는데 유지장치 꼭 해야 하나요?",
          description: "유지장치 종류와 착용 기간을 자세히 설명해 드려요.",
        },
        {
          href: "/blog/orthodontics/partial-orthodontics-front-teeth",
          title: "앞니 부분교정, 전체 교정 대신 할 수 있을까요?",
          description: "재교정을 부분교정으로 해결할 수 있는지 확인해 보세요.",
        },
        {
          href: "/blog/orthodontics/orthodontic-extraction-guide",
          title: "교정할 때 치아를 꼭 빼야 하나요?",
          description: "발치 교정과 비발치 교정의 기준을 쉽게 설명해 드려요.",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────
// Supabase 삽입
// ─────────────────────────────────────────────
async function insertPost(post: typeof post1) {
  // 중복 슬러그 확인
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("slug", post.slug)
    .single();

  if (existing) {
    console.log(`  ⚠️  ${post.slug}: 이미 존재합니다. 건너뜁니다.`);
    return;
  }

  const { error } = await supabase.from("blog_posts").insert({
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    content: post.content,
    published: post.published,
    date: new Date().toISOString().slice(0, 10), // 임시저장 — 발행 시 날짜 재지정
  });

  if (error) {
    console.error(`  ❌ ${post.slug} 삽입 실패:`, error.message);
  } else {
    console.log(`  ✅ ${post.slug}: 임시저장 상태로 삽입 완료`);
  }
}

async function run() {
  console.log("=== 교정 블로그 포스트 2편 삽입 ===\n");

  console.log("[1/2] 앞니 부분교정");
  await insertPost(post1);

  console.log("\n[2/2] 교정 후 재발·재교정");
  await insertPost(post2);

  console.log("\n=== 완료 ===");
  console.log("관리자 대시보드에서 내용 확인 후 발행 예약하세요.");
  console.log("→ /admin?tab=content&sub=posts");
}

run().catch((e) => { console.error(e); process.exit(1); });
