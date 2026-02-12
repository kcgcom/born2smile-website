import Image from "next/image";

interface ClinicIllustrationProps {
  className?: string;
}

/**
 * 진료실 일러스트 이미지
 * 따뜻하고 친근한 치과 진료실 느낌을 전달하는 일러스트
 */
export function ClinicIllustration({ className }: ClinicIllustrationProps) {
  return (
    <Image
      src="/images/clinic-illustration.png"
      alt="따뜻한 분위기의 치과 진료실 일러스트"
      width={600}
      height={480}
      className={className}
      priority
    />
  );
}
