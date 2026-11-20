import { getIndexNowHistory } from "@/lib/indexnow";
import { verifyAdminRequest, unauthorizedResponse } from "../_lib/auth";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const slug = new URL(request.url).searchParams.get("slug")?.trim();
  if (slug && !/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug)) {
    return Response.json(
      { error: "INVALID_SLUG", message: "게시물 슬러그를 확인해 주세요." },
      { status: 400, headers },
    );
  }

  try {
    return Response.json({ data: await getIndexNowHistory(slug) }, { headers });
  } catch {
    return Response.json(
      { error: "INDEXNOW_STATUS_ERROR", message: "IndexNow 기록을 불러올 수 없습니다." },
      { status: 500, headers },
    );
  }
}
