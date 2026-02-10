"use client";

import { useState, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Clock, Send } from "lucide-react";
import { CLINIC, HOURS, TREATMENTS } from "@/lib/constants";
import { FadeIn } from "@/components/ui/Motion";
import { KakaoMap } from "@/components/ui/KakaoMap";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: 실제 폼 제출 로직 (API Route 또는 외부 서비스)
    setSubmitted(true);
  };

  return (
    <>
      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-[var(--color-primary)] uppercase">
          Contact
        </p>
        <h1 className="font-headline text-4xl font-bold text-gray-900 md:text-5xl">
          예약 / 상담
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          온라인으로 편리하게 예약하시거나 전화로 상담받으세요.
        </p>
      </section>

      <section className="section-padding bg-white">
        <div className="container-narrow">
          <div className="grid gap-10 md:grid-cols-5">
            {/* 예약 폼 */}
            <FadeIn direction="left" className="md:col-span-3">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                온라인 예약
              </h2>

              {submitted ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <Send size={28} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">
                    예약 접수가 완료되었습니다
                  </h3>
                  <p className="text-sm text-gray-600">
                    확인 후 빠른 시간 내에 연락드리겠습니다.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      이름 <span aria-hidden="true" className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      aria-required="true"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                      placeholder="홍길동"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      연락처 <span aria-hidden="true" className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      aria-required="true"
                      pattern="[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}"
                      title="올바른 전화번호를 입력해 주세요 (예: 010-1234-5678)"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                      placeholder="010-0000-0000"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="treatment"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      진료 과목
                    </label>
                    <select
                      id="treatment"
                      name="treatment"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                    >
                      <option value="">선택해 주세요</option>
                      {TREATMENTS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      <option value="other">기타</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="date"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      희망 날짜
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      min={today}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      문의 내용
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                      placeholder="궁금하신 내용을 입력해 주세요."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[var(--color-primary)] px-6 py-4 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                  >
                    예약 접수하기
                  </button>
                </form>
              )}
            </FadeIn>

            {/* 사이드 정보 */}
            <FadeIn direction="right" delay={0.2} className="space-y-6 md:col-span-2">
              {/* 빠른 연락 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 text-lg font-bold text-gray-900">
                  빠른 연락
                </h3>
                <div className="space-y-4">
                  <a
                    href={CLINIC.phoneHref}
                    aria-label={`대표전화 ${CLINIC.phone}`}
                    className="flex items-center gap-3 rounded-xl bg-[var(--color-primary)] p-4 text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                  >
                    <Phone size={20} aria-hidden="true" />
                    <div>
                      <div className="text-xs text-blue-200">대표전화</div>
                      <div className="text-lg font-bold">{CLINIC.phone}</div>
                    </div>
                  </a>
                  <a
                    href={CLINIC.phoneHref}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-700 transition-colors hover:border-[var(--color-primary)]"
                  >
                    <MessageCircle
                      size={20}
                      aria-hidden="true"
                      className="text-[var(--color-primary)]"
                    />
                    <div>
                      <div className="text-xs text-gray-400">카카오톡 상담</div>
                      <div className="text-sm font-medium">채널 준비 중</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* 진료시간 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <Clock
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--color-primary)]"
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
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500">
                  점심시간: {HOURS.lunchTime}
                </p>
              </div>

              {/* 오시는 길 + 지도 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                  <MapPin
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--color-primary)]"
                  />
                  오시는 길
                </h3>
                <KakaoMap className="mb-3 aspect-video" />
                <p className="text-sm text-gray-600">{CLINIC.address}</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
