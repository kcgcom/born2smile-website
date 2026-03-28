import type { Metadata } from "next";
import { CLINIC, BASE_URL } from "@/lib/constants";
import { getBreadcrumbJsonLd, serializeJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${CLINIC.name} 개인정보처리방침입니다. 수집 항목, 이용 목적, 보유 기간, 이용자 권리 등을 안내합니다.`,
  alternates: { canonical: `${BASE_URL}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "홈", href: "/" },
    { name: "개인정보처리방침", href: "/privacy" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <section className="bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="font-headline text-4xl font-bold text-gray-900">
            개인정보처리방침
          </h1>
          <p className="mt-4 text-gray-600">
            {CLINIC.name}는 이용자의 개인정보를 소중히 여기며 관련 법령을 준수합니다.
          </p>
        </div>
      </section>

      <section className="section-padding bg-white">
        <div className="mx-auto max-w-3xl px-4">
          <div className="prose prose-gray max-w-none space-y-10 text-base leading-relaxed text-gray-700">

            <p className="text-sm text-gray-500">
              시행일: 2017년 3월 1일 &nbsp;|&nbsp; 최종 수정일: 2026년 3월 27일
            </p>

            {/* 1 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                1. 개인정보의 수집 항목 및 수집 방법
              </h2>
              <p className="mb-3">
                {CLINIC.name}는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-28 px-4 py-3 text-left font-semibold text-gray-700">수집 경로</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">수집 항목</th>
                      <th className="w-24 px-4 py-3 text-left font-semibold text-gray-700">필수 여부</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">블로그 좋아요</td>
                      <td className="px-4 py-3 text-gray-700">익명 방문자 식별자(UUID, 브라우저 로컬스토리지 및 서버 저장)</td>
                      <td className="px-4 py-3 text-gray-700">자동 생성</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">웹사이트 방문</td>
                      <td className="px-4 py-3 text-gray-700">쿠키 기반 방문자 식별자(GA Client ID), 브라우저·기기 정보, 방문 페이지, 체류 시간 (IP는 익명화 처리 후 저장하지 않음)</td>
                      <td className="px-4 py-3 text-gray-700">자동 수집</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                2. 개인정보의 수집 및 이용 목적
              </h2>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  웹사이트 이용 현황 분석 및 서비스 개선
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  블로그 콘텐츠 반응 집계 (좋아요 기능)
                </li>
              </ul>
            </div>

            {/* 3 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                3. 개인정보의 보유 및 이용 기간
              </h2>
              <p className="mb-3">
                개인정보는 수집·이용 목적이 달성된 후 지체 없이 파기합니다. 전자 파일은 복구 불가능한 방법으로 영구 삭제하며, 출력물이 있는 경우 분쇄하여 파기합니다.
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">항목</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">보유 기간</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">웹사이트 방문 로그</td>
                      <td className="px-4 py-3 text-gray-700">수집일로부터 26개월</td>
                      <td className="px-4 py-3 text-gray-700">개인정보보호법 제21조</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">블로그 좋아요 식별자</td>
                      <td className="px-4 py-3 text-gray-700">서비스 이용 목적 달성 시까지</td>
                      <td className="px-4 py-3 text-gray-700">개인정보보호법 제21조</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                4. 개인정보의 제3자 제공
              </h2>
              <p>
                {CLINIC.name}는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
                다만, 이용자의 동의가 있거나 법령의 규정에 의한 경우에는 예외로 합니다.
              </p>
            </div>

            {/* 5 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                5. 개인정보처리 위탁
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">수탁업체</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">위탁 업무</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">위탁 국가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Google LLC</td>
                      <td className="px-4 py-3 text-gray-700">웹사이트 방문 통계 분석 (Google Analytics 4)</td>
                      <td className="px-4 py-3 text-gray-700">미국</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Supabase Inc.</td>
                      <td className="px-4 py-3 text-gray-700">블로그 데이터 및 좋아요 집계 저장</td>
                      <td className="px-4 py-3 text-gray-700">미국</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">Vercel Inc.</td>
                      <td className="px-4 py-3 text-gray-700">웹사이트 호스팅 및 서버 운영</td>
                      <td className="px-4 py-3 text-gray-700">미국</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                6. 이용자의 권리와 행사 방법
              </h2>
              <p className="mb-3">이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  개인정보 열람 요구
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  오류 정정 및 삭제 요구
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  처리 정지 요구
                </li>
              </ul>
              <p className="mt-3">
                권리 행사는 아래 개인정보 보호책임자에게 전화 또는 방문으로 신청하실 수 있으며,
                지체 없이 조치하겠습니다.
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                7. 개인정보 보호책임자
              </h2>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <ul className="space-y-2 text-sm">
                  <li><span className="font-medium">성명:</span> {CLINIC.representative}</li>
                  <li><span className="font-medium">직책:</span> 대표원장</li>
                  <li><span className="font-medium">전화:</span> {CLINIC.phone}</li>
                  <li><span className="font-medium">주소:</span> {CLINIC.address}</li>
                </ul>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                개인정보 침해에 관한 신고·상담은 개인정보보호위원회(privacy.go.kr, 국번없이 182) 또는
                한국인터넷진흥원(kisa.or.kr, 국번없이 118)에 문의하실 수 있습니다.
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="font-headline mb-4 text-xl font-bold text-gray-900">
                8. 개인정보처리방침 변경
              </h2>
              <p>
                이 개인정보처리방침은 법령·정책 변경이나 서비스 개선에 따라 내용이 변경될 수 있습니다.
                변경 시 웹사이트 공지사항 또는 본 페이지를 통해 사전 고지합니다.
              </p>
            </div>

          </div>
        </div>
      </section>

      <div className="h-16 md:hidden" />
    </>
  );
}
