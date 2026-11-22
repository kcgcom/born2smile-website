import { OWNER_ACCESS, type AdminAccess, type AdminPermission } from "./admin-access";

function emailList(value?: string) {
  return new Set((value ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

const owners = emailList(process.env.ADMIN_EMAILS);
const permissions: [AdminPermission, Set<string>][] = [
  ["content", emailList(process.env.ADMIN_CONTENT_EMAILS)],
  ["staff", emailList(process.env.ADMIN_STAFF_EMAILS)],
];

export function getAdminAccess(email?: string): AdminAccess | null {
  if (!email) return null;
  const normalized = email.toLowerCase();
  if (owners.has(normalized)) return OWNER_ACCESS;
  const granted = permissions.filter(([, emails]) => emails.has(normalized)).map(([permission]) => permission);
  return granted.length ? { isOwner: false, permissions: granted } : null;
}

export function listConfiguredAdminAccounts() {
  const emails = new Set([...owners, ...permissions.flatMap(([, members]) => [...members])]);
  return [...emails].flatMap((email) => {
    const access = getAdminAccess(email);
    if (!access) return [];
    return [{ email, permissions: access.permissions, enabled: true, isOwner: access.isOwner }];
  });
}
