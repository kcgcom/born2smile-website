import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { BASE_URL, CLINIC, GOOGLE_REVIEW, NAVER_REVIEW } from "@/lib/constants";

const REVIEW_URL = `${BASE_URL}/review`;
const SHARE_TITLE = `${CLINIC.name} 방문 후기 남기기`;
const SHARE_DESCRIPTION = "방문해 주셔서 감사합니다. 네이버나 구글 중 편한 곳에 후기를 남겨주세요.";
const CLINIC_PHOTO = "/images/facility/waiting-room.jpg";

export const metadata: Metadata = {
  title: "리뷰 안내",
  description: "서울본치과에 방문해 주셔서 감사합니다. 네이버 또는 Google에서 방문 후기를 남기실 수 있습니다.",
  alternates: { canonical: REVIEW_URL },
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: CLINIC.name,
    url: REVIEW_URL,
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [{ url: CLINIC_PHOTO, width: 1200, height: 800, alt: `${CLINIC.name} 대기실` }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [CLINIC_PHOTO],
  },
};

const REVIEW_OPTIONS = [
  {
    label: "Google 리뷰 남기기",
    description: "Google 계정으로 로그인",
    href: GOOGLE_REVIEW.writeReviewUrl,
  },
  {
    label: "네이버 리뷰 남기기",
    description: "영수증 또는 카드 결제로 방문 인증",
    href: NAVER_REVIEW.writeReviewUrl,
  },
].filter(({ href }) => Boolean(href));

export default function ReviewPage() {
  return (
    <section className="bg-[var(--background)] bg-linear-to-b from-[var(--color-primary)]/5 to-transparent px-4 pt-[clamp(5.125rem,12svh,7rem)] pb-8 sm:px-6 sm:pb-10 lg:pt-32 lg:pb-12">
      <div className="mx-auto grid max-w-xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm lg:max-w-5xl lg:grid-cols-[1fr_0.9fr]">
        <div className="relative aspect-[5/1] max-h-44 w-full bg-[var(--background)] min-[360px]:aspect-[3/1] max-sm:[@media(max-height:740px)_and_(min-height:601px)]:max-h-22 max-sm:[@media(max-height:600px)]:max-h-16 max-[359px]:[@media(max-height:600px)]:order-last lg:order-last lg:aspect-auto lg:max-h-none">
          <Image
            src={CLINIC_PHOTO}
            alt={`${CLINIC.name} 대기실`}
            fill
            preload
            sizes="(min-width: 1080px) 485px, (min-width: 1024px) 46vw, (min-width: 624px) 576px, 100vw"
            className="object-cover object-[center_53%] lg:object-center"
          />
        </div>
        <div className="min-w-0 px-4 pt-4 pb-6 max-[359px]:[@media(max-height:600px)]:pt-3 min-[375px]:pt-5 min-[412px]:px-6 sm:px-9 sm:pt-8 sm:pb-9 lg:p-12">
          <div className="border-l-2 border-[var(--color-gold-light)] pl-3 sm:pl-4">
            <h1 className="font-headline break-keep text-[1.0625rem] leading-[1.6875rem] font-semibold tracking-tight">
              방문해 주셔서 감사합니다.
            </h1>
            <div className="mt-2 space-y-2.5 break-keep text-[1.0625rem] leading-[1.6875rem] text-[var(--foreground)] min-[360px]:mt-2.5 sm:mt-3 sm:space-y-3">
              <p className="text-pretty">후기를 남겨주시면 치과를 알아보는 분들에게 많은 도움이 됩니다.</p>
              <p className="text-pretty">환자분이 느끼셨던 점을 솔직하게 남겨주세요.</p>
              <p className="text-pretty">
                “꼭! 필요한 치료만, 오래오래 편안하게”
                <br />
                앞으로도 진심을 다해 진료하겠습니다.
              </p>
            </div>
          </div>

          {REVIEW_OPTIONS.length > 0 && (
            <nav aria-label="리뷰 남기기" className="mt-2 border-t border-[var(--border)] pt-2 min-[360px]:mt-4 min-[360px]:pt-3 min-[375px]:mt-5 min-[375px]:pt-4 sm:mt-7 sm:pt-5">
              <ul className="grid gap-2">
                {REVIEW_OPTIONS.map(({ label, description, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="flex min-h-15 items-center justify-between gap-2.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/4 px-3 py-2 transition-colors hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8 active:bg-[var(--color-primary)]/12 motion-reduce:transition-none min-[360px]:min-h-16 min-[360px]:py-2.5 sm:px-4"
                    >
                      <span className="min-w-0">
                        <span className="block break-keep text-lg leading-tight font-semibold text-[var(--color-primary-dark)]">{label}</span>
                        <span className="mt-1 block break-keep text-base leading-snug text-[var(--foreground)]/80">{description}</span>
                      </span>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]">
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
