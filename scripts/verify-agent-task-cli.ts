import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const id = randomUUID();
const claimToken = "c".repeat(64);
let version = "2026-11-15T00:00:00.000Z";
const directory = resolve(".tmp/agent-task-cli-test");
mkdirSync(directory, { recursive: true });
const input = resolve(directory, `${randomUUID()}.json`);
const server = createServer(async (request, response) => {
  try {
    assert.equal(request.headers.authorization, "Bearer isolated-cli-test-key");
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    const payload: Record<string, unknown> = { data: { id, updatedAt: version, status: "in_progress" } };
    if (request.method !== "GET") {
      assert.equal(body.baseUpdatedAt, version);
      if (body.action === "claim") payload.claimToken = claimToken;
      else assert.equal(body.claimToken, claimToken);
      version = new Date(Date.parse(version) + 1).toISOString();
      payload.data = { id, updatedAt: version, status: body.action === "submit" ? "review" : "in_progress" };
    }
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(payload));
  } catch { response.statusCode = 400; response.end("{}"); }
});

async function run(args: string[]) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
    const child = spawn(process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), "scripts/agent-task.ts", ...args], { env: { ...process.env, AGENT_CONTENT_SECRET: "isolated-cli-test-key" }, windowsHide: true });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", value => { stdout += value; });
    child.stderr.on("data", value => { stderr += value; });
    child.on("error", reject);
    child.on("close", code => done({ code, stdout, stderr }));
  });
}

async function verify() {
  await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const claimed = await run(["claim", "--id", id, "--worker-id", "test-worker", "--base-url", origin]);
  assert.equal(claimed.code, 0, claimed.stderr);
  assert(!claimed.stdout.includes(claimToken));
  assert(!claimed.stdout.includes("isolated-cli-test-key"));
  const output = JSON.parse(claimed.stdout.trim().split("\n").at(-1)!);
  const saved = readFileSync(output.sessionFile, "utf8");
  assert.equal(JSON.parse(saved).claimToken, claimToken);
  writeFileSync(input, JSON.stringify({ message: "원문 확인 중입니다.", blockedReason: null }), { flag: "wx" });
  const progress = await run(["progress", "--session", output.sessionFile, "--file", input]);
  assert.equal(progress.code, 0, progress.stderr);
  const progressed = JSON.parse(progress.stdout.trim().split("\n").at(-1)!);
  assert.notEqual(progressed.sessionFile, output.sessionFile);
  assert.equal(readFileSync(output.sessionFile, "utf8"), saved, "Old session files must remain unchanged");
  const stale = await run(["progress", "--session", output.sessionFile, "--file", input]);
  assert.equal(stale.code, 1);
  assert(!stale.stderr.includes(claimToken));
  const wrongOrigin = await run(["progress", "--session", progressed.sessionFile, "--file", input, "--base-url", "https://evil.invalid"]);
  assert.equal(wrongOrigin.code, 1);
  writeFileSync(input, JSON.stringify({ kind: "draft", postSlug: `task-${id}`, summary: "비공개 원고를 검토 요청합니다." }));
  const requestId = randomUUID();
  const submitted = await run(["submit", "--session", progressed.sessionFile, "--file", input, "--request-id", requestId]);
  assert.equal(submitted.code, 0, submitted.stderr);
  const submittedOutput = JSON.parse(submitted.stdout.trim().split("\n").at(-1)!);
  assert.equal(submittedOutput.status, "review");
  assert.equal(submittedOutput.requestId, requestId);
  console.log("Agent task CLI verified: token privacy, separate versioned session files, stale rejection, origin binding and submission request IDs.");
}
void verify().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "CLI verification failed"); process.exitCode = 1; }).finally(() => server.close());
