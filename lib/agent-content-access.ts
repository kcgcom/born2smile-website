import { timingSafeEqual } from "node:crypto";

interface Secrets { content?: string; admin?: string }
function matches(token: string, secret?: string) {
  return Boolean(secret && Buffer.byteLength(token) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(token), Buffer.from(secret)));
}

export function classifyAgentContentAccess(token: string | undefined, method: string, pathname: string, secrets: Secrets): "none" | "denied" | "misconfigured" | "agent:content" {
  if (!token) return "none";
  if (!matches(token, secrets.content)) return "none";
  if (secrets.content === secrets.admin) return "misconfigured";
  const readable = /^\/api\/admin\/(?:blog-posts(?:\/[a-z0-9-]+(?:\/(?:performance|source))?)?|blog-feedback|search-console|analytics|content-planner|naver-datalab\/trend-summary|content-revisions(?:\/[a-f0-9-]{36})?)$/.test(pathname);
  if (method === "GET" && readable) return "agent:content";
  const task = /^\/api\/admin\/content-tasks\/[a-f0-9-]{36}$/.test(pathname);
  if (method === "GET" && (pathname === "/api/admin/content-tasks" || task)) return "agent:content";
  if (method === "POST" && pathname === "/api/admin/content-tasks") return "agent:content";
  if (method === "PATCH" && task) return "agent:content";
  if (method === "POST" && /^\/api\/admin\/content-tasks\/[a-f0-9-]{36}\/draft$/.test(pathname)) return "agent:content";
  if (method === "POST" && (pathname === "/api/admin/content-revisions" || pathname === "/api/admin/upload")) return "agent:content";
  return "denied";
}
