import Link from "next/link";
import { Instagram, MessageCircle, BookOpen, MapPin, Star } from "lucide-react";
import { CLINIC, HOURS, LINKS, GOOGLE_REVIEW } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t-2 border-[var(--color-gold)]/30 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* 병원 정보 */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-[var(--color-gold-light)]">
              {CLINIC.name}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>{CLINIC.address}</li>
              <li>
                대표전화:{" "}
                <a
                  href={CLINIC.phoneHref}
                  className="text-white hover:underline"
                >
                  {CLINIC.phone}
                </a>
              </li>
              <li>대표자: {CLINIC.representative}</li>
              <li>사업자등록번호: {CLINIC.businessNumber}</li>
            </ul>
          </div>

          {/* 진료시간 */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">진료시간</h3>
            <ul className="max-w-56 space-y-1.5 text-sm">
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
              <li className="mt-2 border-t border-gray-700 pt-2">
                점심시간: {HOURS.lunchTime}
              </li>
            </ul>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white">
                  병원 소개
                </Link>
              </li>
              <li>
                <Link href="/treatments" className="hover:text-white">
                  진료 안내
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  상담 안내
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  블로그
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* SNS 링크 + 구글 리뷰 */}
        {(Object.values(LINKS).some((url) => url !== "") || GOOGLE_REVIEW.writeReviewUrl) && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {GOOGLE_REVIEW.writeReviewUrl && (
              <a
                href={GOOGLE_REVIEW.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google 리뷰 남기기"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-[var(--color-gold)] hover:text-white"
              >
                <Star size={18} />
              </a>
            )}
            {LINKS.kakaoChannel && (
              <a
                href={LINKS.kakaoChannel}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="카카오톡 채널"
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
                aria-label="인스타그램"
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
                aria-label="네이버 블로그"
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
                aria-label="네이버 지도"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-[#03C75A] hover:text-white"
              >
                <MapPin size={18} />
              </a>
            )}
          </div>
        )}

        {/* 하단 카피라이트 */}
        <div className="mt-10 border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
          <p>
            &copy; 2017–{new Date().getFullYear()} {CLINIC.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
