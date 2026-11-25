import { emergencyNoticeSchema, publishEmergencyNotice, readEmergencyNotice } from "@/lib/emergency-notice";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

const headers = { "Cache-Control": "private, no-store" };

async function handleNotice(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access) return unauthorizedResponse(forbidden());

  try {
    if (request.method === "GET") {
      return Response.json({ data: { notice: await readEmergencyNotice() } }, { headers });
    }

    let notice = null;
    if (request.method === "PUT") {
      const body = await request.json().catch(() => null);
      const parsed = emergencyNoticeSchema.safeParse(body);
      if (!parsed.success || Date.parse(parsed.data.expiresAt) <= Date.now()) {
        return Response.json(
          { message: "공지 문구를 240자 이내로 입력하고 미래의 종료 시각을 선택해 주세요." },
          { status: 400, headers },
        );
      }
      notice = parsed.data;
    }

    await publishEmergencyNotice(notice);
    return Response.json({ data: { notice } }, { headers });
  } catch (error) {
    console.error("[emergency-notice] Global Config request failed", error instanceof Error ? error.name : "");
    const message = request.method === "GET" ? "긴급 공지를 불러오지 못했습니다." : "긴급 공지 저장을 확인하지 못했습니다. 현재 공지를 다시 확인해 주세요.";
    return Response.json({ message }, { status: 503, headers });
  }
}

export const GET = handleNotice;
export const PUT = handleNotice;
export const DELETE = handleNotice;
