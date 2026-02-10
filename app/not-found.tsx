import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { CLINIC } from "@/lib/constants";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
          404
        </p>
        <h1 className="font-headline mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mx-auto mb-8 max-w-md text-gray-600">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          {CLINIC.name} 홈페이지에서 원하시는 정보를 찾아보세요.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <Home size={18} />
            홈으로 이동
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-4 text-base font-medium text-gray-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft size={18} />
            예약 / 상담
          </Link>
        </div>
      </div>
    </section>
  );
}
