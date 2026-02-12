import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";
import BlogContent from "@/components/blog/BlogContent";

export const metadata: Metadata = {
  title: "구강건강 블로그",
  description: `${CLINIC.name} 구강건강 블로그 - 올바른 양치법, 잇몸 관리, 임플란트 관리, 충치 예방 등 일상에서 실천할 수 있는 구강관리 정보를 전해드립니다.`,
};

export default function BlogPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
          Dental Health Blog
        </p>
        <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
          구강건강 블로그
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          건강한 치아를 위한 올바른 관리법과 치과 상식을 알려드립니다.
          <br className="hidden sm:block" />
          마음에 드는 글은 가족, 친구에게 공유해 보세요.
        </p>
      </section>

      <BlogContent />

      <div className="h-16 md:hidden" />
    </>
  );
}
