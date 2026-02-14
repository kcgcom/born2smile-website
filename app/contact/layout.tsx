import type { Metadata } from "next";
import { CLINIC, BASE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "상담 안내",
  description: `${CLINIC.name} 전화 상담 안내. 대표전화 ${CLINIC.phone}. ${CLINIC.address}`,
  alternates: { canonical: `${BASE_URL}/contact` },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
