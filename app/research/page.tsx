import { notFound } from "next/navigation";
import { RESEARCH_HUB_ENABLED } from "@/lib/research/config";

// 허브 페이지는 페이지가 충분히 쌓일 때까지 비활성
// lib/research/config.ts의 RESEARCH_HUB_ENABLED를 true로 변경하면 활성화
export default function ResearchHubPage() {
  if (!RESEARCH_HUB_ENABLED) notFound();

  // TODO: 허브 활성화 시 구현
  return null;
}
