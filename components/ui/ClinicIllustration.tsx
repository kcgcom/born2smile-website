interface ClinicIllustrationProps {
  className?: string;
}

/**
 * 진료실 일러스트 SVG
 * 따뜻하고 친근한 치과 진료실 느낌을 전달하는 플랫 스타일 일러스트
 */
export function ClinicIllustration({ className }: ClinicIllustrationProps) {
  return (
    <svg
      viewBox="0 0 600 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="따뜻한 분위기의 치과 진료실 일러스트"
    >
      {/* 배경 - 밝은 벽 */}
      <rect width="600" height="480" rx="24" fill="#F0F7FF" />

      {/* 바닥 */}
      <rect y="360" width="600" height="120" rx="0" fill="#E8D5B7" />
      <rect y="360" width="600" height="4" fill="#D4C4A8" />

      {/* 창문 */}
      <rect x="60" y="40" width="180" height="200" rx="12" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="3" />
      {/* 창문 프레임 */}
      <line x1="150" y1="40" x2="150" y2="240" stroke="#93C5FD" strokeWidth="2" />
      <line x1="60" y1="140" x2="240" y2="140" stroke="#93C5FD" strokeWidth="2" />
      {/* 창밖 풍경 - 하늘과 나무 */}
      <rect x="63" y="43" width="84" height="94" rx="4" fill="#BFE6FF" />
      <rect x="153" y="43" width="84" height="94" rx="4" fill="#BFE6FF" />
      <rect x="63" y="143" width="84" height="94" rx="4" fill="#BFE6FF" />
      <rect x="153" y="143" width="84" height="94" rx="4" fill="#BFE6FF" />
      {/* 나무 */}
      <ellipse cx="100" cy="200" rx="28" ry="32" fill="#86EFAC" opacity="0.7" />
      <ellipse cx="200" cy="190" rx="24" ry="28" fill="#4ADE80" opacity="0.6" />
      <ellipse cx="130" cy="100" rx="20" ry="24" fill="#86EFAC" opacity="0.5" />
      <ellipse cx="190" cy="90" rx="16" ry="20" fill="#4ADE80" opacity="0.5" />
      {/* 구름 */}
      <ellipse cx="110" cy="65" rx="20" ry="10" fill="white" opacity="0.8" />
      <ellipse cx="185" cy="58" rx="16" ry="8" fill="white" opacity="0.8" />

      {/* 진료 의자 - 메인 */}
      {/* 의자 베이스 */}
      <rect x="260" y="350" width="80" height="12" rx="6" fill="#94A3B8" />
      <rect x="290" y="300" width="20" height="50" rx="4" fill="#94A3B8" />
      {/* 의자 시트 */}
      <path
        d="M230 250 Q230 230, 250 225 L370 210 Q390 208, 395 225 L400 280 Q402 295, 390 300 L250 310 Q235 312, 232 295 Z"
        fill="#60A5FA"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      {/* 의자 등받이 */}
      <path
        d="M370 210 Q375 180, 385 160 L400 110 Q405 95, 415 100 L425 105 Q432 108, 430 120 L415 200 Q412 215, 400 218 L395 225 Z"
        fill="#60A5FA"
        stroke="#3B82F6"
        strokeWidth="2"
      />
      {/* 베개 */}
      <ellipse cx="408" cy="108" rx="22" ry="14" fill="#93C5FD" stroke="#60A5FA" strokeWidth="1.5" />

      {/* 진료 조명 */}
      <line x1="340" y1="30" x2="340" y2="80" stroke="#CBD5E1" strokeWidth="3" />
      <line x1="340" y1="80" x2="300" y2="130" stroke="#CBD5E1" strokeWidth="3" />
      <ellipse cx="290" cy="140" rx="28" ry="14" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2" />
      <ellipse cx="290" cy="140" rx="16" ry="8" fill="#FDE68A" opacity="0.8" />
      {/* 조명 빛 효과 */}
      <ellipse cx="290" cy="200" rx="50" ry="30" fill="#FEF9C3" opacity="0.2" />

      {/* 도구 트레이 */}
      <rect x="180" y="270" width="50" height="6" rx="3" fill="#94A3B8" />
      <rect x="200" y="276" width="10" height="50" rx="3" fill="#94A3B8" />
      <rect x="190" y="326" width="30" height="8" rx="4" fill="#94A3B8" />
      {/* 트레이 위 도구들 */}
      <rect x="186" y="264" width="4" height="12" rx="2" fill="#64748B" />
      <rect x="194" y="262" width="3" height="14" rx="1.5" fill="#64748B" />
      <rect x="201" y="264" width="4" height="12" rx="2" fill="#64748B" />
      <rect x="209" y="261" width="3" height="15" rx="1.5" fill="#64748B" />
      <rect x="216" y="264" width="4" height="12" rx="2" fill="#64748B" />

      {/* 캐비닛 */}
      <rect x="440" y="220" width="130" height="140" rx="8" fill="#FAFAFA" stroke="#E5E7EB" strokeWidth="2" />
      <rect x="448" y="228" width="114" height="40" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="448" y="276" width="114" height="40" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <rect x="448" y="324" width="114" height="28" rx="4" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      {/* 캐비닛 손잡이 */}
      <rect x="495" y="244" width="20" height="4" rx="2" fill="#CBD5E1" />
      <rect x="495" y="292" width="20" height="4" rx="2" fill="#CBD5E1" />
      <rect x="495" y="336" width="20" height="4" rx="2" fill="#CBD5E1" />

      {/* 캐비닛 위 화분 */}
      <rect x="455" y="197" width="30" height="24" rx="4" fill="#D97706" opacity="0.6" />
      <ellipse cx="470" cy="188" rx="18" ry="14" fill="#34D399" />
      <ellipse cx="462" cy="180" rx="10" ry="10" fill="#6EE7B7" />
      <ellipse cx="478" cy="182" rx="9" ry="9" fill="#34D399" />
      <line x1="470" y1="197" x2="470" y2="188" stroke="#059669" strokeWidth="2" />

      {/* 오른쪽 큰 화분 */}
      <path d="M540 310 L530 360 L570 360 L560 310 Z" fill="#92400E" opacity="0.5" />
      <ellipse cx="550" cy="295" rx="28" ry="22" fill="#34D399" />
      <ellipse cx="540" cy="282" rx="16" ry="16" fill="#6EE7B7" />
      <ellipse cx="560" cy="285" rx="14" ry="14" fill="#34D399" />
      <ellipse cx="548" cy="272" rx="10" ry="12" fill="#86EFAC" />
      <line x1="550" y1="310" x2="550" y2="294" stroke="#059669" strokeWidth="2.5" />

      {/* 왼쪽 화분 */}
      <path d="M50 330 L42 360 L74 360 L66 330 Z" fill="#92400E" opacity="0.5" />
      <ellipse cx="58" cy="318" rx="20" ry="18" fill="#34D399" />
      <ellipse cx="50" cy="308" rx="12" ry="12" fill="#6EE7B7" />
      <ellipse cx="66" cy="310" rx="10" ry="10" fill="#4ADE80" />
      <line x1="58" y1="330" x2="58" y2="317" stroke="#059669" strokeWidth="2" />

      {/* 벽 액자 - 치아/미소 아이콘 */}
      <rect x="310" y="50" width="56" height="56" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <path
        d="M326 82 Q338 92, 350 82"
        stroke="#60A5FA"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="332" cy="72" r="3" fill="#60A5FA" />
      <circle cx="344" cy="72" r="3" fill="#60A5FA" />

      {/* 벽 액자 2 - 하트 */}
      <rect x="380" y="55" width="48" height="48" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
      <path
        d="M396 76 Q396 68, 404 68 Q412 68, 412 76 Q412 68, 420 68 Q428 68, 428 76 Q428 88, 412 96 Q396 88, 396 76 Z"
        fill="#FCA5A5"
        opacity="0.6"
      />

      {/* 바닥 디테일 - 타일 선 */}
      <line x1="0" y1="400" x2="600" y2="400" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="0" y1="440" x2="600" y2="440" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="100" y1="360" x2="100" y2="480" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="200" y1="360" x2="200" y2="480" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="300" y1="360" x2="300" y2="480" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="400" y1="360" x2="400" y2="480" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
      <line x1="500" y1="360" x2="500" y2="480" stroke="#D4C4A8" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}
