export const ADMIN_PERMISSIONS = ["operations", "content", "staff"] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export interface AdminAccess {
  isOwner: boolean;
  permissions: readonly AdminPermission[];
}

export const OWNER_ACCESS: AdminAccess = { isOwner: true, permissions: ADMIN_PERMISSIONS };

export function hasPasswordAuthentication(methods?: readonly (string | { method: string })[]) {
  return methods?.some((entry) => (typeof entry === "string" ? entry : entry.method) === "password") ?? false;
}

export const ADMIN_HOME: Record<AdminPermission, string> = {
  operations: "/admin/operations/overview",
  content: "/admin/content/tasks",
  staff: "/admin/system/settings",
};

export function getStaffHome(access: AdminAccess) {
  return access.permissions.includes("content") ? "/staff/content/tasks" : "/staff/system/settings";
}

export function canOpenStaffPage(access: AdminAccess, pathname: string) {
  if (pathname === "/staff") return true;
  if (pathname === "/staff/system/settings") return access.permissions.includes("staff");
  return access.permissions.includes("content")
    && /^\/staff\/(?:content\/(?:tasks|posts|review|revisions|schedule|images)|preview)(?:\/|$)/.test(pathname);
}

export function canUseAdminApi(access: AdminAccess, method: string, pathname: string) {
  if (access.isOwner || pathname === "/api/admin/auth-check") return true;
  if (pathname === "/api/admin-presence" && method === "POST") return true;
  if (access.permissions.includes("operations") && method === "GET"
    && /^\/api\/(?:dev\/(?:pagespeed|env-status)|admin\/(?:analytics|blog-analytics|blog-posts|business-profile|indexing-status|indexnow-status|search-attention|search-console|posthog\/(?:blog-cards|conversion|health|reading)))$/.test(pathname)) return true;
  if (access.permissions.includes("staff") && /^(GET|PUT)$/.test(method)
    && /^\/api\/admin\/site-config\/(clinic|hours|links)$/.test(pathname)) return true;
  if (!access.permissions.includes("content")) return false;
  if (method === "GET") {
    return /^\/api\/admin\/(?:blog-posts(?:\/[a-z0-9-]+(?:\/(?:source|performance))?)?|blog-analytics|blog-feedback|content-planner|content-tasks(?:\/[a-f0-9-]+)?|content-revisions(?:\/[a-f0-9-]+)?|publication-review|images|site-config\/schedule)$/.test(pathname);
  }
  if (method === "POST") return /^\/api\/admin\/(?:blog-posts|content-planner|content-tasks(?:\/[a-f0-9-]+\/draft)?|content-revisions|publication-review|upload)$/.test(pathname);
  if (method === "PUT") return /^\/api\/admin\/(?:blog-posts\/[a-z0-9-]+|content-planner\/[a-z0-9-]+)$/.test(pathname);
  return method === "PATCH" && /^\/api\/admin\/content-tasks\/[a-f0-9-]+$/.test(pathname);
}
