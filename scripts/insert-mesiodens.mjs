import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const post = {
  slug: "mesiodens-supernumerary-tooth-guide",
  title: "아이 앞니 사이에 이가 하나 더 있다고요? 정중과잉치 바로 알기",
  subtitle: "X-ray 찍었더니 거꾸로 박힌 치아가 보인다면",
  excerpt:
    "충치 검진 왔다가 X-ray에서 뜻밖의 치아가 발견되는 경우가 있어요. 앞니 사이에 숨어 있는 '정중과잉치', 100명 중 1명꼴로 나타나지만 부모님들은 생소한 경우가 많죠. 무엇인지, 왜 치료가 필요한지 쉽게 설명해 드릴게요.",
  category: "pediatric",
  tags: ["증상가이드"],
  date: "2026-04-06",
  published: false,
  content: [
    {
      type: "paragraph",
      text: "아이 충치 검진을 위해 X-ray를 찍었는데, 의사 선생님이 \"이가 하나 더 있어요\"라고 하셨나요? 처음 들으면 당황스러울 수 있어요. 치아가 더 있다는 게 무슨 뜻인지, 당장 빼야 하는 건지, 걱정부터 앞서시죠.",
    },
    {
      type: "paragraph",
      text: "결론부터 말씀드리면, 크게 무서워하실 필요는 없어요. 다만 제때 확인하고 적절히 대처하는 것이 중요한 상황이에요. 오늘은 '정중과잉치'가 무엇인지, 왜 발견되면 관리가 필요한지 차근차근 알려드릴게요.",
    },
    {
      type: "heading",
      level: 2,
      text: "과잉치가 뭔가요? 사랑니랑 다른 건가요?",
    },
    {
      type: "paragraph",
      text: "우리가 태어날 때 정해진 치아 수는 유치 20개, 영구치 28개(사랑니 포함 시 최대 32개)예요. 그런데 드물게 이 수보다 치아가 하나 혹은 그 이상 더 만들어지는 경우가 있어요. 이걸 '과잉치'라고 해요.",
    },
    {
      type: "paragraph",
      text: "많은 분들이 '과잉치 = 사랑니'로 알고 계세요. 하지만 사랑니는 정상 치아 개수 안에 포함된 치아예요. 과잉치는 그것과는 별개로 '여분으로 생겨난 치아'를 말해요. 위치도 다양하게 나타날 수 있고, 잇몸 속에 숨어 있어서 겉으로는 전혀 티가 나지 않는 경우도 많아요.",
    },
    {
      type: "heading",
      level: 2,
      text: "정중과잉치(앞니 과잉치)란 무엇인가요?",
    },
    {
      type: "paragraph",
      text: "과잉치 중에서도 위 앞니 두 개 사이, 즉 정중앙 부위에 생기는 것을 특별히 '정중과잉치(앞니 과잉치)'라고 해요. 영구치 앞니가 나오는 자리 바로 옆이나 위에 숨어 있는 경우가 많아요.",
    },
    {
      type: "paragraph",
      text: "100명 중 약 1명꼴로 발견되는데, 생각보다 드물지 않아요. 그런데 잇몸 겉에 그냥 나와 있는 경우보다 뼛속에 거꾸로 박혀 있는 경우가 훨씬 많아서, X-ray를 찍기 전까지는 부모님도 아이도 전혀 모르고 지내는 경우가 대부분이에요.",
    },
    {
      type: "heading",
      level: 2,
      text: "그냥 두면 어떻게 되나요?",
    },
    {
      type: "paragraph",
      text: "정중과잉치는 생긴 위치에 따라 문제가 될 수도, 그렇지 않을 수도 있어요. 하지만 앞니 사이 공간을 차지하고 있으면 주변 정상 영구치에 영향을 줄 수 있어요.",
    },
    {
      type: "list",
      style: "bullet",
      items: [
        "영구 앞니가 제자리에 나오지 못하고 방향이 틀어질 수 있어요",
        "앞니 사이가 벌어지거나 공간이 좁아지는 부정교합이 생길 수 있어요",
        "정상 치아의 뿌리(치근)가 손상될 위험도 있어요",
        "오랫동안 발견하지 못하면 교정 치료가 더 복잡해질 수 있어요",
      ],
    },
    {
      type: "paragraph",
      text: "물론 위치나 방향에 따라 자연스럽게 지켜보는 경우도 있어요. 무조건 당장 뺀다기보다, 정확한 평가를 먼저 하는 게 중요해요.",
    },
    {
      type: "heading",
      level: 2,
      text: "왜 3D CT까지 찍어야 하나요?",
    },
    {
      type: "paragraph",
      text: "일반 X-ray는 2D 사진이에요. 앞뒤를 납작하게 찍기 때문에, 과잉치가 어느 방향으로 기울어져 있는지, 주변 치아 뿌리와 얼마나 가까운지는 파악하기 어려워요.",
    },
    {
      type: "paragraph",
      text: "3D CT는 입체로 찍어요. '정확히 어디에, 어느 방향으로, 얼마나 깊이 있는지'를 한눈에 볼 수 있어요. 이 정보가 있어야 발치할 때 주변 정상 치아를 건드리지 않고 안전하게 꺼낼 수 있어요. CT 없이 '감'으로 발치하는 것과 지도를 보고 발치하는 것, 어느 쪽이 안전한지는 분명하죠.",
    },
    {
      type: "heading",
      level: 2,
      text: "치료 과정은 어떻게 되나요?",
    },
    {
      type: "paragraph",
      text: "정중과잉치가 확인되면 아래 순서로 진행해요.",
    },
    {
      type: "list",
      style: "number",
      items: [
        "파노라마 X-ray + 3D CT로 위치·방향·깊이를 정확히 확인",
        "영구치 맹출 상황, 아이 나이, 과잉치 위치를 종합해 치료 시기 결정",
        "국소마취 후 발치 (아이들도 충분히 안전하게 받을 수 있어요)",
        "발치 후 필요하다면 영구치 맹출 방향 모니터링 또는 교정 여부 상담",
      ],
    },
    {
      type: "paragraph",
      text: "발치 시기는 케이스마다 달라요. 영구치가 아직 많이 자라지 않은 상태라면 좀 더 기다리기도 하고, 이미 정상 앞니 맹출을 방해하고 있다면 빠른 제거가 필요해요. 아이의 성장 상태를 보면서 결정하는 거예요.",
    },
    {
      type: "faq",
      question: "과잉치가 있으면 무조건 빼야 하나요?",
      answer:
        "꼭 그런 건 아니에요. 위치와 방향에 따라 다르게 접근해요. 정상 치아 맹출을 방해하거나 부정교합을 유발할 가능성이 있을 때 발치를 권유드려요. 정기적으로 관찰하면서 시기를 잡는 경우도 있어요.",
    },
    {
      type: "faq",
      question: "아이가 어린데 발치해도 괜찮을까요?",
      answer:
        "국소마취를 하기 때문에 통증은 최소화할 수 있어요. 아이가 무서움을 느끼지 않도록 충분히 설명하면서 진행하는 게 중요하고, 대부분의 경우 아이들도 잘 받아요. 오히려 발치 시기를 놓치면 나중에 교정 치료 범위가 더 넓어질 수 있어요.",
    },
    {
      type: "faq",
      question: "정중과잉치가 있으면 교정 치료도 해야 하나요?",
      answer:
        "과잉치를 일찍 발견해서 제거하면, 영구치가 제자리로 자연스럽게 이동하는 경우도 있어요. 하지만 이미 앞니 배열이 틀어진 후라면 교정이 필요할 수 있어요. 발치 후 6개월~1년 정도 지켜보면서 판단해요.",
    },
    {
      type: "faq",
      question: "정기검진에서 X-ray를 꼭 찍어야 하나요?",
      answer:
        "정중과잉치처럼 잇몸 속에 숨어 있는 문제는 겉으로 보이지 않아요. 구강검진만으로는 발견하기 어렵고, X-ray를 찍어야 확인할 수 있어요. 보통 만 3~4세 이후 첫 파노라마 촬영을 권유드리는 이유가 이 때문이에요.",
    },
    {
      type: "heading",
      level: 2,
      text: "정기검진이 가장 좋은 예방이에요",
    },
    {
      type: "paragraph",
      text: "정중과잉치는 아이 스스로 증상을 느끼기 어려워요. 아프지도 않고, 겉으로 봐도 티가 나지 않죠. 부모님도, 아이도 전혀 모르고 지내다가 영구치가 삐뚤게 올라오고 나서야 뒤늦게 발견하는 경우가 적지 않아요.",
    },
    {
      type: "paragraph",
      text: "6개월에 한 번 정기검진을 받으면, 이런 문제를 딱 좋은 타이밍에 발견할 수 있어요. '지금 괜찮은데 굳이?' 하는 마음이 드실 수 있지만, 미리 발견하면 치료 범위도 좁고, 아이가 받는 부담도 훨씬 작아요.",
    },
    {
      type: "paragraph",
      text: "서울본치과에서는 어린이 정기검진 시 파노라마 X-ray를 포함해 구강 전체를 꼼꼼히 살펴보고 있어요. 과잉치처럼 눈에 안 보이는 부분까지 챙기는 게 저희의 역할이니까요. 걱정되시는 게 있다면 편하게 물어보세요.",
    },
  ],
};

const { data, error } = await supabase
  .from("blog_posts")
  .insert({
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    date: post.date,
    content: post.content,
    published: false,
    updated_by: "admin",
  })
  .select("slug, title, category, date, published")
  .single();

if (error) {
  console.error("❌ Insert 실패:", error.message);
  process.exit(1);
}

console.log("✅ Insert 완료:", data);
