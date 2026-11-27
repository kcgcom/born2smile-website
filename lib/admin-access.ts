export interface AdminAccess {
  isOwner: boolean;
}

export const OWNER_ACCESS: AdminAccess = { isOwner: true };
export const STAFF_ACCESS: AdminAccess = { isOwner: false };

export function hasPasswordAuthentication(methods?: readonly (string | { method: string })[]) {
  return methods?.some((entry) => (typeof entry === "string" ? entry : entry.method) === "password") ?? false;
}

export const ADMIN_HOME = {
  operations: "/admin/operations/overview",
  content: "/admin/content/tasks",
  system: "/admin/system/settings",
};

export const STAFF_HOME = "/staff";
export const STAFF_FIRST_VISIT = "/staff/first-visit";
export const STAFF_REVIEW_GUIDE = `${STAFF_FIRST_VISIT}/review`;
export const STAFF_INSURANCE_FORMS = "/staff/insurance-forms";
export const STAFF_POSTS = "/staff/posts";

export function canOpenStaffPage(pathname: string) {
  return pathname === STAFF_HOME || pathname === STAFF_POSTS
    || pathname === STAFF_FIRST_VISIT || pathname === STAFF_REVIEW_GUIDE || pathname === STAFF_INSURANCE_FORMS
    || /^\/staff\/(?:tasks|review|schedule|images|posts\/[^/]+|revisions\/[^/]+|preview\/[^/]+\/[^/]+)$/.test(pathname);
}

export function canUseAdminApi(access: AdminAccess, method: string, pathname: string) {
  if (access.isOwner || pathname === "/api/admin/auth-check") return true;
  if (pathname === "/api/admin/emergency-notice") return ["GET", "PUT", "DELETE"].includes(method);
  if (pathname === "/api/admin-presence" && method === "POST") return true;
  if (method === "GET") {
    if (/^\/api\/admin\/insurance-forms(?:\/[a-f0-9-]+)?$/.test(pathname)) return true;
    return /^\/api\/admin\/(?:blog-posts(?:\/[a-z0-9-]+(?:\/(?:source|performance))?)?|blog-analytics|blog-feedback|content-planner|content-tasks(?:\/[a-f0-9-]+)?|content-revisions(?:\/[a-f0-9-]+)?|publication-review|images|site-config\/(?:clinic|hours|schedule))$/.test(pathname);
  }
  if (method === "POST") return /^\/api\/admin\/(?:blog-posts|content-planner|content-tasks(?:\/[a-f0-9-]+\/draft)?|content-revisions|publication-review|upload)$/.test(pathname);
  if (method === "PUT") return /^\/api\/admin\/(?:blog-posts\/[a-z0-9-]+|content-planner\/[a-z0-9-]+)$/.test(pathname);
  return method === "PATCH" && (pathname === "/api/admin/site-config/hours"
    || /^\/api\/admin\/content-tasks\/[a-f0-9-]+$/.test(pathname));
}
