import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CLINIC, TREATMENTS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "진료 안내",
  description: `${CLINIC.name} 진료 안내 - 임플란트, 치아교정, 틀니 및 심미보철, 소아치료, 보존치료, 스케일링`,
};

export default function TreatmentsPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
          Treatments
        </p>
        <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
          진료 안내
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          {CLINIC.name}에서 제공하는 진료 분야를 안내해 드립니다.
        </p>
      </section>

      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TREATMENTS.map((treatment) => (
              <Link
                key={treatment.id}
                href={treatment.href}
                className="group rounded-2xl border border-gray-100 bg-gray-50 p-8 transition-all hover:border-[var(--color-primary)] hover:bg-white hover:shadow-lg"
              >
                <h2 className="mb-2 text-2xl font-bold text-gray-900 group-hover:text-[var(--color-primary)]">
                  {treatment.name}
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-gray-600">
                  {treatment.shortDesc}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                  자세히 보기
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
