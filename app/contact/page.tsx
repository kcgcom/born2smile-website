"use client";

import { Phone, MessageCircle, MapPin, Clock, Star, ExternalLink } from "lucide-react";
import { CLINIC, HOURS, LINKS, GOOGLE_REVIEW, NAVER_REVIEW } from "@/lib/constants";
import { FadeIn } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";

export default function ContactPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-gold)] uppercase">
          Contact
        </p>
        <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
          상담 안내
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          전화로 편리하게 상담받으세요. 친절하게 안내해 드리겠습니다.
        </p>
      </section>

      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="grid gap-10 md:grid-cols-2">
            {/* 전화 상담 안내 */}
            <FadeIn direction="left" className="space-y-6">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                전화 상담
              </h2>
              <p className="text-gray-600">
                진료 예약 및 상담은 전화로 접수하고 있습니다.
                <br />
                궁금하신 점이 있으시면 언제든 연락주세요.
              </p>

              <a
                href={CLINIC.phoneHref}
                aria-label={`대표전화 ${CLINIC.phone}`}
                className="flex items-center gap-4 rounded-2xl bg-[var(--color-primary)] p-6 text-white transition-colors hover:bg-[var(--color-primary-dark)]"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                  <Phone size={28} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm text-blue-200">대표전화</div>
                  <div className="text-2xl font-bold">{CLINIC.phone}</div>
                </div>
              </a>

              {LINKS.kakaoChannel ? (
                <a
                  href={LINKS.kakaoChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="카카오톡 채널로 상담하기"
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-[#FEE500] p-6 text-gray-900 transition-colors hover:bg-[#FDD835]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/60">
                    <MessageCircle
                      size={28}
                      aria-hidden="true"
                      className="text-gray-900"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-700">카카오톡 상담</div>
                    <div className="text-sm font-bold">채널 바로가기</div>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-700">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF3E0]">
                    <MessageCircle
                      size={28}
                      aria-hidden="true"
                      className="text-[var(--color-gold)]"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">카카오톡 상담</div>
                    <div className="text-sm font-medium">채널 준비 중</div>
                  </div>
                </div>
              )}

              {/* 진료시간 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Clock
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--color-gold)]"
                  />
                  진료시간
                </h3>
                <ul className="space-y-2 text-sm">
                  {HOURS.schedule.map((item) => (
                    <li
                      key={item.day}
                      className="flex justify-between text-gray-600"
                    >
                      <span>{item.day}</span>
                      <span
                        className={item.open ? "font-medium text-gray-900" : "text-gray-400"}
                      >
                        {item.time}
                        {"note" in item && item.note && (
                          <span className="ml-1 text-xs text-[var(--color-gold)]">
                            ({item.note})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500">
                  점심시간: {HOURS.lunchTime} | {HOURS.closedDays}
                </p>
                {HOURS.notice && (
                  <p className="mt-1 text-xs text-gray-500">{HOURS.notice}</p>
                )}
              </div>

              {/* 리뷰 남기기 */}
              {GOOGLE_REVIEW.writeReviewUrl && (
                <a
                  href={GOOGLE_REVIEW.writeReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-[var(--color-gold)] hover:bg-[#FFFBF0]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF3E0]">
                    <Star
                      size={28}
                      aria-hidden="true"
                      className="fill-[var(--color-gold)] text-[var(--color-gold)]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">치료 후기</div>
                    <div className="text-sm font-bold text-gray-900">
                      Google 리뷰 남기기
                    </div>
                  </div>
                  <ExternalLink
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-gray-400"
                  />
                </a>
              )}
              {NAVER_REVIEW.writeReviewUrl && (
                <a
                  href={NAVER_REVIEW.writeReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-[#03C75A]/30 hover:bg-[#F0FFF5]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F5E9]">
                    <Star
                      size={28}
                      aria-hidden="true"
                      className="fill-[#03C75A] text-[#03C75A]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">치료 후기</div>
                    <div className="text-sm font-bold text-gray-900">
                      네이버 리뷰 남기기
                    </div>
                  </div>
                  <ExternalLink
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-gray-400"
                  />
                </a>
              )}
            </FadeIn>

            {/* 오시는 길 + 지도 */}
            <FadeIn direction="right" delay={0.2} className="space-y-6">
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                <MapPin
                  size={22}
                  aria-hidden="true"
                  className="mr-2 inline-block text-[var(--color-primary)]"
                />
                오시는 길
              </h2>
              <KakaoMap className="aspect-square md:aspect-[4/3]" />
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <p className="font-medium text-gray-900">{CLINIC.name}</p>
                <p className="mt-1 text-sm text-gray-600">{CLINIC.address}</p>
                <a
                  href={CLINIC.phoneHref}
                  className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)]"
                >
                  {CLINIC.phone}
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
