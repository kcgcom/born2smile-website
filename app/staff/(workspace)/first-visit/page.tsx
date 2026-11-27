import { BASE_URL } from "@/lib/constants";
import { CopyGuideButton } from "./CopyGuideButton";

const GUIDE_URL = new URL("/contact", BASE_URL).href;

export default function StaffFirstVisitPage() {
  return (
    <>
      <h1 className="text-xl font-bold">내원 안내</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        처음 문의하신 분에게 예약 방법, 진료시간, 위치가 담긴 안내 링크를 보내세요.
      </p>
      <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center break-all rounded-lg text-sm text-blue-800 underline focus-visible:outline-2 focus-visible:outline-blue-700">
        {GUIDE_URL}<span className="sr-only"> (새 창에서 열림)</span>
      </a>
      <CopyGuideButton
        value={GUIDE_URL}
        label="안내 링크 복사"
        successMessage="안내 링크를 복사했습니다. 문자나 카카오톡에 붙여넣으세요."
        failureMessage="링크를 복사하지 못했습니다. 위 주소를 직접 복사해 주세요."
      />
    </>
  );
}
