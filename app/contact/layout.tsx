import type { Metadata } from "next";
import { CLINIC } from "@/lib/constants";

export const metadata: Metadata = {
  title: "예약/상담",
  description: `${CLINIC.name} 상담 문의. 대표전화 ${CLINIC.phone}. ${CLINIC.address}`,
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
