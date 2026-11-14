import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createRevisionSchema } from "../lib/content-revisions";
import { object, validateBaseUrl } from "./agent/context";

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    console.log("사용법: pnpm agent:revision --file 수정안.json [--base-url http://localhost:3000] [--check]\n--check는 외부 호출 없이 입력만 검증합니다. 전송에는 AGENT_CONTENT_DRAFT_SECRET이 필요하며 공개 원본을 수정하지 않습니다. 반영 명령은 제공하지 않습니다.");
    return;
  }
  let file = "";
  let origin = "http://localhost:3000";
  let check = false;
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (seen.has(key)) throw new Error("Duplicate argument");
    seen.add(key);
    if (key === "--check") { check = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error("Missing argument");
    if (key === "--file") file = value;
    else if (key === "--base-url") origin = value;
    else throw new Error("Unknown argument");
  }
  if (!file) throw new Error("Missing file");
  const input = createRevisionSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!input.success) { console.error("수정안 형식이 올바르지 않습니다. slug·baseRevision·reason·candidate와 본문 검증 조건을 확인하세요."); process.exitCode = 1; return; }
  origin = validateBaseUrl(origin);
  if (check) { console.log(JSON.stringify({ valid: true, slug: input.data.slug })); return; }
  for (const name of [".env.local", ".env"]) if (existsSync(name)) loadEnvFile(name);
  const token = process.env.AGENT_CONTENT_DRAFT_SECRET;
  if (!token) { console.error("AGENT_CONTENT_DRAFT_SECRET이 필요합니다."); process.exitCode = 1; return; }
  const response = await fetch(`${origin}/api/admin/content-revisions`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input.data) });
  if (!response.ok) { console.error(`수정안을 저장하지 못했습니다 (HTTP ${response.status}). 409는 원본 변경, 503은 DB·마이그레이션 상태를 확인하세요.`); process.exitCode = 1; return; }
  const payload: unknown = await response.json();
  if (!object(payload) || !object(payload.data) || typeof payload.data.id !== "string" || !/^[a-f0-9-]{36}$/.test(payload.data.id)) throw new Error("Invalid response");
  console.log(JSON.stringify({ id: payload.data.id, reviewUrl: `${origin}/admin/content/revisions/${payload.data.id}`, applied: false }));
}

void main().catch(() => { console.error("수정안 처리에 실패했습니다. --help로 인수·파일·서버 설정을 확인하세요."); process.exitCode = 1; });
