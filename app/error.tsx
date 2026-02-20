"use client";

import { CLINIC } from "@/lib/constants";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-headline text-4xl font-bold text-gray-900">
        문제가 발생했습니다
      </h1>
      <p className="mt-4 text-gray-600">
        일시적인 오류입니다. 잠시 후 다시 시도해 주세요.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          다시 시도
        </button>
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
