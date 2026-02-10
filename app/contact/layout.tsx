import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";

export const metadata: Metadata = {
  title: "예약/상담",
  description: `${CLINIC.name} 온라인 예약 및 상담. 대표전화 ${CLINIC.phone}. ${CLINIC.address}`,
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
