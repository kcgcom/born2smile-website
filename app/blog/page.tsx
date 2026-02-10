import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";

export const metadata: Metadata = {
  title: "블로그",
  description: `${CLINIC.name} 블로그 - 김포 치과 건강 정보, 구강 관리 팁, 공지사항. 임플란트, 교정, 충치 예방 등 유용한 치과 정보를 전해드립니다.`,
};

const PLACEHOLDER_POSTS = [
  {
    id: 1,
    category: "공지사항",
    title: "서울본치과 홈페이지가 새롭게 오픈했습니다",
    excerpt:
      "안녕하세요, 서울본치과입니다. 더 나은 서비스 제공을 위해 홈페이지를 새롭게 오픈하였습니다.",
    date: "2026-02-10",
  },
  {
    id: 2,
    category: "건강정보",
    title: "올바른 양치질 방법, 알고 계신가요?",
    excerpt:
      "매일 하는 양치질이지만 올바른 방법을 모르는 경우가 많습니다. 치과 전문의가 알려주는 올바른 양치법을 확인해 보세요.",
    date: "2026-02-10",
  },
  {
    id: 3,
    category: "건강정보",
    title: "임플란트 후 관리법 5가지",
    excerpt:
      "임플란트 시술 후 올바른 관리가 수명을 결정합니다. 임플란트를 오래 사용하기 위한 관리 방법을 소개합니다.",
    date: "2026-02-10",
  },
];

export default function BlogPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
          Blog
        </p>
        <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
          블로그
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          {CLINIC.name}의 공지사항과 치과 건강 정보를 전해드립니다.
        </p>
      </section>

      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="space-y-6">
            {PLACEHOLDER_POSTS.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-shadow hover:shadow-md md:p-8"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  {post.title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
