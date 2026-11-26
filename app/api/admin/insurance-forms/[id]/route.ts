import { z } from "zod";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "../../_lib/auth";
import { formsResponse, insuranceFormsBucket } from "../_lib/forms";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access) return unauthorizedResponse(forbidden());

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return formsResponse({ message: "잘못된 양식 주소입니다." }, 400);
  const { data, error } = await insuranceFormsBucket().createSignedUrl(`${id}.pdf`, 120);
  if (error) {
    if (error.status === 404 || error.statusCode === "404" || error.statusCode === "NoSuchKey") {
      return formsResponse({ message: "양식 파일을 찾을 수 없습니다. 목록을 새로고침해 주세요." }, 404);
    }
    return formsResponse({ message: "양식 파일을 열 수 없습니다." }, 503);
  }
  return formsResponse({ data: { url: data.signedUrl } });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access?.isOwner) return unauthorizedResponse(forbidden());

  const { id } = await params;
  if (!idSchema.safeParse(id).success) return formsResponse({ message: "잘못된 양식 주소입니다." }, 400);
  const { error } = await insuranceFormsBucket().remove([`${id}.pdf`]);
  if (error) return formsResponse({ message: "보험 양식을 삭제하지 못했습니다." }, 503);
  return formsResponse({ data: { ok: true } });
}
