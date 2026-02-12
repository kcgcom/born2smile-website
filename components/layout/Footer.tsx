import { CLINIC } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
          {/* 병원명 */}
          <div>
            <h3 className="text-base font-bold text-white">
              Seoul Born2smile Dental Clinic
            </h3>
          </div>

          {/* 주소 및 연락처 */}
          <div className="text-sm">
            <p>{CLINIC.address}</p>
            <p className="mt-1">
              대표전화:{" "}
              <a
                href={CLINIC.phoneHref}
                className="text-gray-300 hover:text-white"
              >
                {CLINIC.phone}
              </a>
            </p>
          </div>
        </div>

        {/* 카피라이트 */}
        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} {CLINIC.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
