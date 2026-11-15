import { existsSync, readFileSync, mkdirSync, openSync, writeFileSync, closeSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { object, validateBaseUrl } from "./agent/context";
import { taskActions, taskRequest, collectionTaskRequest, taskSessionSchema, type TaskAction } from "./agent/task";

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) {
    console.log("사용법: pnpm agent:task <list|get|propose|claim|progress|release|draft|submit> [--id UUID] [--worker-id 이름] [--file JSON] [--session 세션.json] [--status 상태] [--base-url origin] [--request-id UUID] [--check]\nclaim은 조회 버전을 자동 사용합니다. 이후 명령은 마지막 응답의 sessionFile을 사용하세요. submit 재시도는 같은 --request-id를 사용하세요. 결과·점유 토큰은 Git 제외 .tmp/agent-tasks에 저장하며 콘솔에 토큰을 출력하지 않습니다. --check는 외부 호출 없이 입력을 검사합니다.");
    return;
  }
  const action = argv.shift() as TaskAction;
  if (!taskActions.includes(action)) throw new Error("명령을 확인하세요.");
  const args = new Map<string, string>();
  const allowed = ["--id", "--worker-id", "--file", "--session", "--status", "--base-url", "--request-id", "--check"];
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!allowed.includes(key) || args.has(key)) throw new Error("인수를 확인하세요.");
    const value = key === "--check" ? "true" : argv[++i];
    if (!value || value.startsWith("--")) throw new Error("인수 값이 필요합니다.");
    args.set(key, value);
  }
  const session = args.has("--session") ? taskSessionSchema.parse(JSON.parse(readFileSync(args.get("--session")!, "utf8"))) : undefined;
  const origin = validateBaseUrl(args.get("--base-url") ?? session?.origin ?? "http://localhost:3000");
  if (session && (session.origin !== origin || (args.has("--id") && args.get("--id") !== session.id))) throw new Error("세션 대상이 다릅니다.");
  const input = args.has("--file") ? JSON.parse(readFileSync(args.get("--file")!, "utf8")) : undefined;
  const requestId = args.get("--request-id") ?? randomUUID();
  let spec;
  if (action === "list" || action === "propose") spec = collectionTaskRequest(action, input, args.get("--status"));
  else spec = taskRequest(action, { id: args.get("--id"), workerId: args.get("--worker-id"), session, input: action === "claim" ? { updatedAt: new Date(0).toISOString() } : input, requestId });
  if (args.has("--check")) { console.log(JSON.stringify({ valid: true, action, requestId: action === "submit" ? requestId : undefined })); return; }
  for (const name of [".env.local", ".env"]) if (existsSync(name)) loadEnvFile(name);
  const token = process.env.AGENT_CONTENT_SECRET;
  if (!token) throw new Error("에이전트 키가 필요합니다.");
  const send = async (spec: { path: string; method: string; body?: unknown }) => {
    const response = await fetch(`${origin}${spec.path}`, { method: spec.method, redirect: "error", signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(spec.body ? { body: JSON.stringify(spec.body) } : {}) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  if (action === "claim") {
    const current = await send({ path: spec.path, method: "GET" });
    spec = taskRequest(action, { id: args.get("--id"), workerId: args.get("--worker-id"), input: current.data, requestId });
  }
  // Reserve the output before mutation so an existing file can never be overwritten.
  const directory = resolve(".tmp/agent-tasks");
  mkdirSync(directory, { recursive: true });
  const output = resolve(directory, `${action}-${randomUUID()}.json`);
  const fd = openSync(output, "wx", 0o600);
  try {
    writeFileSync(fd, JSON.stringify({ action, origin, requestId, pending: true }, null, 2));
    const payload: unknown = await send(spec);
    if (!object(payload)) throw new Error("응답 형식을 확인하세요.");
    const data = object(payload.data) ? payload.data : undefined;
    const nextSession = action === "claim" && data ? taskSessionSchema.parse({ origin, id: data.id, updatedAt: data.updatedAt, claimToken: payload.claimToken })
      : session && data && typeof data.updatedAt === "string" ? { ...session, updatedAt: data.updatedAt } : undefined;
    // Truncate our exclusively created file, never a caller-supplied path.
    closeSync(fd);
    writeFileSync(output, JSON.stringify({ action, origin, requestId, payload, session: nextSession }, null, 2), { mode: 0o600 });
    let sessionFile: string | undefined;
    if (nextSession) {
      sessionFile = resolve(directory, `session-${randomUUID()}.json`);
      writeFileSync(sessionFile, JSON.stringify(nextSession, null, 2), { flag: "wx", mode: 0o600 });
    }
    console.log(JSON.stringify({ output, sessionFile, requestId: action === "submit" ? requestId : undefined, id: data?.id, postSlug: data?.postSlug, status: data?.status, reviewUrl: typeof payload.reviewUrl === "string" ? payload.reviewUrl : undefined }));
  } catch (error) {
    try { closeSync(fd); } catch { /* Already closed after saving a response. */ }
    console.error(`작업 처리 실패${error instanceof Error && /^HTTP \d+$/.test(error.message) ? ` (${error.message})` : ""}. 기록: ${output}. 409는 최신 승인·점유·버전을 확인하세요. submit 재시도에는 기록의 requestId를 사용하세요.`);
    process.exitCode = 1;
  }
}
void main().catch(() => { console.error("작업 명령·입력 파일·세션·서버 설정을 확인하세요. pnpm agent:task --help"); process.exitCode = 1; });
