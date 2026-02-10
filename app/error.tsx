"use client";

import { useEffect } from "react";
import { RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-red-500 uppercase">
          오류 발생
        </p>
        <h1 className="font-headline mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
          문제가 발생했습니다
        </h1>
        <p className="mx-auto mb-8 max-w-md text-gray-600">
          일시적인 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-4 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <RotateCcw size={18} />
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-8 py-4 text-base font-medium text-gray-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Home size={18} />
            홈으로 이동
          </a>
        </div>
      </div>
    </section>
  );
}
