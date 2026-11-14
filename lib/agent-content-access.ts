import { timingSafeEqual } from "node:crypto";

interface Secrets { read?: string; draft?: string; admin?: string }
function matches(token: string, secret?: string) {
  return Boolean(secret && Buffer.byteLength(token) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(token), Buffer.from(secret)));
}

export function classifyAgentContentAccess(token: string | undefined, method: string, pathname: string, secrets: Secrets): "none" | "denied" | "misconfigured" | "agent:read" | "agent:draft" {
  if (!token) return "none";
  const read = matches(token, secrets.read);
  const draft = matches(token, secrets.draft);
  if (!read && !draft) return "none";
  if ((secrets.read && (secrets.read === secrets.draft || secrets.read === secrets.admin)) || (secrets.draft && secrets.draft === secrets.admin)) return "misconfigured";
  const readable = /^\/api\/admin\/(?:blog-posts(?:\/[a-z0-9-]+(?:\/(?:performance|source))?)?|blog-feedback|search-console|analytics|content-planner|naver-datalab\/trend-summary|content-revisions(?:\/[a-f0-9-]{36})?)$/.test(pathname);
  if (method === "GET" && readable) return draft ? "agent:draft" : "agent:read";
  if (draft && method === "POST" && pathname === "/api/admin/content-revisions") return "agent:draft";
  return "denied";
}
