import { randomUUID } from "node:crypto";
import { z } from "zod";
import { INSURANCE_FORM_MAX_BYTES, INSURANCE_FORM_NAME_LENGTH, INSURANCE_FORM_URL_LENGTH, type InsuranceForm } from "@/lib/insurance-forms";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";
import { formsResponse, insuranceFormsBucket } from "./_lib/forms";

const nameSchema = z.string().trim().min(1).max(INSURANCE_FORM_NAME_LENGTH);
const namesSchema = z.object({ insurer: nameSchema, title: nameSchema });
const sourceUrlSchema = z.string().trim().max(INSURANCE_FORM_URL_LENGTH)
  .pipe(z.url({ protocol: /^https$/ }).transform((url) => new URL(url)))
  .refine((url) => !url.username && !url.password)
  .transform((url) => url.href)
  .pipe(z.string().max(INSURANCE_FORM_URL_LENGTH));
const metadataSchema = namesSchema.extend({
  sourceUrl: sourceUrlSchema.nullish(),
  sourcePageUrl: sourceUrlSchema.nullish(),
});
const formsSchema = z.array(metadataSchema.extend({ id: z.uuid(), createdAt: z.iso.datetime({ offset: true }) }));
const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access) return unauthorizedResponse(forbidden());

  const db = getSupabaseAdmin();
  const forms: InsuranceForm[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.rpc("list_dental_insurance_forms")
      .order("id").range(offset, offset + PAGE_SIZE - 1);
    const page = formsSchema.safeParse(data);
    if (error || !page.success) return formsResponse({ message: "보험 양식 목록을 불러올 수 없습니다." }, 503);
    forms.push(...page.data);
    if (page.data.length < PAGE_SIZE) break;
  }
  return formsResponse({ data: forms });
}

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access) return unauthorizedResponse(forbidden());

  const form = await request.formData().catch(() => null);
  if (!form) return formsResponse({ message: "양식 등록 요청을 읽을 수 없습니다." }, 400);

  const names = namesSchema.safeParse({ insurer: form.get("insurer"), title: form.get("title") });
  if (!names.success) return formsResponse({ message: "보험사명과 양식명을 각각 80자 이내로 입력해 주세요." }, 400);
  const metadata = metadataSchema.safeParse({
    ...names.data,
    sourceUrl: form.get("sourceUrl") || undefined,
    sourcePageUrl: form.get("sourcePageUrl") || undefined,
  });
  if (!metadata.success) return formsResponse({ message: "출처는 600자 이내의 HTTPS 주소를 입력해 주세요." }, 400);

  const file = form.get("file");
  if (!file || typeof file === "string" || !/\.pdf$/i.test(file.name)) {
    return formsResponse({ message: "PDF 파일을 선택해 주세요." }, 400);
  }
  if (file.size > INSURANCE_FORM_MAX_BYTES) {
    return formsResponse({ message: "4MB 이하의 PDF 파일을 선택해 주세요." }, 413);
  }
  if (await file.slice(0, 5).text() !== "%PDF-") {
    return formsResponse({ message: "PDF 형식의 파일을 선택해 주세요." }, 400);
  }

  const { error } = await insuranceFormsBucket().upload(`${randomUUID()}.pdf`, await file.arrayBuffer(), {
    contentType: "application/pdf",
    cacheControl: "0",
    metadata: metadata.data,
    upsert: false,
  });
  if (error) return formsResponse({ message: "보험 양식을 저장하지 못했습니다." }, 503);
  return formsResponse({ data: { ok: true } }, 201);
}
