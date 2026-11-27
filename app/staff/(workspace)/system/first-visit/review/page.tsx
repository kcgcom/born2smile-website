import { BASE_URL, CLINIC } from "@/lib/constants";
import { CopyGuideButton } from "../CopyGuideButton";

const REVIEW_URL = new URL("/review", BASE_URL).href;
const REVIEW_MESSAGE = [
  `안녕하세요, ${CLINIC.name}입니다.`,
  "진료받으시면서 느끼신 점을 후기로 남겨주시면 감사하겠습니다.",
  "아래 링크에서 네이버와 구글 중 편한 곳을 선택하실 수 있습니다.",
  REVIEW_URL,
].join("\n\n");

export default function StaffReviewGuidePage() {
  return (
    <>
      <h1 className="text-xl font-bold">리뷰 안내</h1>
      <p className="mt-2 text-sm text-slate-600">
        진료를 마친 환자에게 문자나 카카오톡으로 보낼 후기 안내입니다.
      </p>

      <section className="mt-5" aria-labelledby="review-guide-link">
        <h2 id="review-guide-link" className="text-sm font-semibold">환자용 리뷰 링크</h2>
        <a
          href={REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center break-all rounded-lg text-sm text-blue-800 underline"
        >
          {REVIEW_URL}<span className="sr-only"> (새 창에서 열림)</span>
        </a>
        <CopyGuideButton
          value={REVIEW_URL}
          label="리뷰 링크 복사"
          successMessage="리뷰 링크를 복사했습니다."
          failureMessage="링크를 복사하지 못했습니다. 위 주소를 직접 복사해 주세요."
        />
      </section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="review-guide-message">
        <h2 id="review-guide-message" className="text-sm font-semibold">문자·카카오톡 문구</h2>
        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {REVIEW_MESSAGE}
        </p>
        <CopyGuideButton
          value={REVIEW_MESSAGE}
          label="안내 문구 복사"
          successMessage="안내 문구를 복사했습니다."
          failureMessage="문구를 복사하지 못했습니다. 위 문구를 직접 복사해 주세요."
        />
      </section>
    </>
  );
}
