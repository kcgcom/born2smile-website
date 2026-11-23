import { OWNER_ACCESS, STAFF_ACCESS, type AdminAccess } from "./admin-access";

function emailList(value?: string) {
  return new Set((value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

const owners = emailList(process.env.ADMIN_EMAILS);
const staff = emailList([process.env.ADMIN_STAFF_EMAILS, process.env.ADMIN_CONTENT_EMAILS].join(","));

export function getAdminAccess(email?: string): AdminAccess | null {
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (owners.has(normalized)) return OWNER_ACCESS;
  return staff.has(normalized) ? STAFF_ACCESS : null;
}

export function listConfiguredAdminAccounts() {
  const emails = new Set([...owners, ...staff]);
  return [...emails].map((email) => ({ email, enabled: true, isOwner: owners.has(email) }));
}
