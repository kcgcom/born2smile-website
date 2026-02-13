import Link from "next/link";
import { CLINIC, HOURS } from "@/lib/constants";

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
              {CLINIC.businessNumber !== "000-00-00000" && (
                <li>사업자등록번호: {CLINIC.businessNumber}</li>
              )}
            </ul>
          </div>

          {/* 진료시간 */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-white">진료시간</h3>
            <ul className="space-y-1.5 text-sm">
              {HOURS.schedule.map((item) => (
                <li key={item.day} className="flex justify-between">
                  <span>{item.day}</span>
                  <span className={item.open ? "text-white" : "text-gray-500"}>
                    {item.time}
                    {"note" in item && item.note && (
                      <span className="ml-1 text-[var(--color-gold-light)]">
                        ({item.note})
                      </span>
                    )}
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
                  예약/상담
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
