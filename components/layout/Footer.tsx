import { Instagram, MessageCircle, BookOpen, MapPin, Star, ExternalLink, Clock } from "lucide-react";
import { CLINIC, HOURS, LINKS, GOOGLE_REVIEW, NAVER_REVIEW } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t-2 border-[var(--color-gold)]/30 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-28 md:px-6 md:pb-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* 오시는 길 */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl md:text-lg font-bold text-[var(--color-gold-light)]">
              <MapPin size={18} />
              오시는 길
            </h2>
            <ul className="space-y-2 text-lg md:text-base">
              <li>
                {LINKS.naverMap ? (
                  <a
                    href={LINKS.naverMap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:underline"
                  >
                    {CLINIC.address}
                    <span className="sr-only"> (새 창)</span>
                  </a>
                ) : (
                  <span>{CLINIC.address}</span>
                )}
              </li>
              <li className="text-gray-400 text-base md:text-sm">한강센트럴자이 아파트 101동 대각선</li>
              <li className="text-gray-400 text-base md:text-sm">커피빈(김포장기DT점) 맞은편</li>
              {LINKS.naverMap && (
                <li className="pt-1">
                  <a
                    href={LINKS.naverMap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--color-gold-light)] hover:underline"
                  >
                    <MapPin size={14} className="shrink-0" />
                    네이버 지도에서 보기
                    <span className="sr-only"> (새 창)</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* 진료시간 */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl md:text-lg font-bold text-white">
              <Clock size={18} className="text-[var(--color-gold-light)]" />
              진료시간
            </h2>
            <ul className="space-y-1.5 text-lg md:max-w-80 md:text-base">
              {HOURS.schedule.map((item) => (
                <li key={item.day} className="flex justify-between">
                  <span>
                    {item.day}
                    {"note" in item && item.note && (
                      <span className="ml-1 text-[var(--color-gold-light)]">
                        ({item.note})
                      </span>
                    )}
                  </span>
                  <span className={item.open ? "text-white" : "text-gray-500"}>
                    {item.time}
                  </span>
                </li>
              ))}
              <li className="mt-2 border-t border-gray-700 pt-2 text-gray-500">
                공휴일 휴진 · 점심시간 {HOURS.lunchTime}
              </li>
            </ul>
          </div>

          {/* 리뷰 남기기 */}
          {(GOOGLE_REVIEW.writeReviewUrl || NAVER_REVIEW.writeReviewUrl) && (
            <div>
              <h2 className="mb-2 text-xl md:text-lg font-bold text-white">리뷰 남기기</h2>
              <p className="mb-3 text-base md:text-sm leading-relaxed text-gray-400">
                소중한 후기가 다른 분들에게 큰 도움이 됩니다.
              </p>
              <div className="space-y-3">
                {GOOGLE_REVIEW.writeReviewUrl && (
                  <a
                    href={GOOGLE_REVIEW.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-gray-800 p-4 transition-colors hover:bg-gray-700"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDF3E0]">
                      <Star size={18} className="fill-[var(--color-gold)] text-[var(--color-gold)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base md:text-sm text-gray-400">치료 후기</div>
                      <div className="text-lg md:text-base font-medium text-white">Google 리뷰 남기기 <span className="sr-only">(새 창)</span></div>
                    </div>
                    <ExternalLink size={14} className="shrink-0 text-gray-500" />
                  </a>
                )}
                {NAVER_REVIEW.writeReviewUrl && (
                  <a
                    href={NAVER_REVIEW.writeReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-gray-800 p-4 transition-colors hover:bg-gray-700"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9]">
                      <Star size={18} className="fill-[#03C75A] text-[#03C75A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base md:text-sm text-gray-400">치료 후기</div>
                      <div className="text-lg md:text-base font-medium text-white">Naver 리뷰 남기기 <span className="sr-only">(새 창)</span></div>
                    </div>
                    <ExternalLink size={14} className="shrink-0 text-gray-500" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SNS 링크 */}
        {Object.values(LINKS).some((url) => url !== "") && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {LINKS.kakaoChannel && (
              <a
                href={LINKS.kakaoChannel}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="카카오톡 채널 (새 창)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-[#FEE500] hover:text-gray-900"
              >
                <MessageCircle size={18} />
              </a>
            )}
            {LINKS.instagram && (
              <a
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="인스타그램 (새 창)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white"
              >
                <Instagram size={18} />
              </a>
            )}
            {LINKS.naverBlog && (
              <a
                href={LINKS.naverBlog}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="네이버 블로그 (새 창)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-[#03C75A] hover:text-white"
              >
                <BookOpen size={18} />
              </a>
            )}
            {LINKS.naverMap && (
              <a
                href={LINKS.naverMap}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="네이버 지도 (새 창)"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-[#03C75A] hover:text-white"
              >
                <MapPin size={18} />
              </a>
            )}
          </div>
        )}

        {/* 하단 카피라이트 */}
        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-sm text-gray-500">
          <p>
            &copy; 2017–{new Date().getFullYear()} {CLINIC.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
