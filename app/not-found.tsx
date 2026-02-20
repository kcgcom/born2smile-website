import Link from "next/link";
import { CLINIC } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-headline text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-lg text-gray-600">
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <p className="mt-2 text-sm text-gray-500">
        주소가 변경되었거나 삭제된 페이지일 수 있습니다.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          홈으로 돌아가기
        </Link>
        <a
          href={CLINIC.phoneHref}
          className="rounded-full border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          전화 상담 {CLINIC.phone}
        </a>
      </div>
    </main>
  );
}
