export const INSURANCE_FORMS_API = "/api/admin/insurance-forms";
export const INSURANCE_FORM_MAX_BYTES = 4 * 1024 * 1024;
export const INSURANCE_FORM_NAME_LENGTH = 80;
export const INSURANCE_FORM_URL_LENGTH = 600;

export interface InsuranceForm {
  id: string;
  insurer: string;
  title: string;
  createdAt: string;
  sourceUrl?: string | null;
  sourcePageUrl?: string | null;
}
