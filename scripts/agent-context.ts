import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { collectContext, PERIODS, type Period } from "./agent/context";

const HELP = `사용법: pnpm agent:context --target /treatments/implant --period 90d
  --target     /treatments/{진료ID} 또는 /blog/{카테고리}/{slug} (필수)
  --period     7d, 30d, 90d, 180d (기본 90d; 검색의 30d는 28d로 표시)
  --limit      관련 공개 글 본문 수 1~20 (기본 5)
  --base-url   로컬 서버 origin 또는 공식 사이트 origin (기본 http://localhost:3000)
  --output     저장할 새 JSON 파일 경로 (기본 .tmp/agent-context/ 내 새 파일)
  --offline    외부 호출 없이 로컬 대상과 수집 계약 확인
부분 조회·인증 미설정·offline은 JSON을 저장하고 본체 종료 코드 2를 반환합니다(pnpm run은 1로 전달할 수 있음).
콘텐츠 변경·발행·삭제·강제 동기화를 실행하지 않습니다. 기존 API의 서버 캐시는 갱신될 수 있습니다.`;

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help")) { console.log(HELP); return; }
  const args = new Map<string, string>();
  let offline = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--offline") { offline = true; continue; }
    const [key, ...inline] = arg.split("=");
    if (!["--target", "--period", "--limit", "--base-url", "--output"].includes(key) || args.has(key)) throw new Error("알 수 없거나 중복된 인수입니다. --help를 확인하세요.");
    const value = inline.length ? inline.join("=") : argv[++i];
    if (!value || value.startsWith("--")) throw new Error("인수 값이 누락됐습니다. --help를 확인하세요.");
    args.set(key, value);
  }
  const target = args.get("--target");
  if (!target) throw new Error("--target이 필요합니다. --help를 확인하세요.");
  const period = args.get("--period") ?? "90d";
  if (!PERIODS.includes(period as Period)) throw new Error("기간은 7d, 30d, 90d, 180d 중 선택하세요.");
  const output = resolve(args.get("--output") ?? `.tmp/agent-context/context-${Date.now()}.json`);
  const outputRelative = relative(process.cwd(), output);
  if (isAbsolute(outputRelative) || outputRelative.startsWith("..") || !output.endsWith(".json") || existsSync(output)) throw new Error("출력은 작업 폴더 안의 새 .json 파일이어야 합니다.");
  // Preserve process environment overrides; never print configuration values.
  if (!offline) for (const name of [".env.local", ".env"]) if (existsSync(name)) loadEnvFile(name);
  const report = await collectContext({ target, period: period as Period, limit: Number(args.get("--limit") ?? "5"),
    baseUrl: args.get("--base-url") ?? "http://localhost:3000", token: offline ? undefined : process.env.AGENT_CONTENT_READ_SECRET || process.env.AGENT_CONTENT_DRAFT_SECRET || process.env.ADMIN_CLI_SECRET, offline });
  const localFiles = report.target.sourceFiles.map(path => ({ path, hash: createHash("sha256").update(readFileSync(path)).digest("hex") }));
  let gitCommit: string | null = null;
  try { gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* A source archive may not contain Git metadata. */ }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...report, localFiles, gitCommit }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ output: outputRelative, partial: report.partial, contentCount: report.content.length }));
  if (report.partial) process.exitCode = 2;
}

void main().catch(() => {
  // Avoid serializing errors from filesystem/network/environment providers.
  console.error("자료 수집에 실패했습니다. 인수·출력 경로·환경 설정을 확인하세요. --help로 사용법을 볼 수 있습니다.");
  process.exitCode = 1;
});
