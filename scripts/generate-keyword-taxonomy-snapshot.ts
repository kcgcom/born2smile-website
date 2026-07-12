import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATEGORY_KEYWORDS } from "../lib/admin-naver-datalab-keywords";

const outFile = path.resolve(process.cwd(), "lib/keyword-taxonomy/generated/active-snapshot.ts");
const SUPABASE_TIMEOUT_MS = 8_000;

function fetchWithTimeout(input: string | URL | Request, init?: RequestInit) {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env"));
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  let version: number | null = null;
  let taxonomy: unknown = CATEGORY_KEYWORDS;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const { data, error } = await createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { fetch: fetchWithTimeout },
      })
        .from("keyword_taxonomy_versions")
        .select("version,taxonomy")
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        version = data.version;
        taxonomy = data.taxonomy;
      }
    } catch (error) {
      console.warn("Active taxonomy fetch failed; using code fallback:", error instanceof Error ? error.message : error);
    }
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `// 자동 생성 파일입니다. 직접 수정하지 마세요.\nimport type { CategoryKeywords } from "@/lib/admin-naver-datalab-keywords";\n\nexport const GENERATED_KEYWORD_TAXONOMY_VERSION: number | null = ${version ?? "null"};\nexport const GENERATED_KEYWORD_TAXONOMY = ${JSON.stringify(taxonomy, null, 2)} as CategoryKeywords[];\n`);
  console.log(`Generated keyword taxonomy snapshot v${version ?? "code"} → ${path.relative(process.cwd(), outFile)}`);
}

void main();
