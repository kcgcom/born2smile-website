import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const INSURANCE_FORMS_BUCKET = "dental-insurance-forms";

export function insuranceFormsBucket() {
  return getSupabaseAdmin().storage.from(INSURANCE_FORMS_BUCKET);
}

export function formsResponse(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
