import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { ResearchPage } from "../lib/research/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../lib/research/generated/pages-snapshot.ts");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("research_pages")
    .select("slug, data")
    .eq("verified", true)
    .order("slug");

  if (error) {
    console.error("Supabase 조회 실패:", error);
    process.exit(1);
  }

  const pages: ResearchPage[] = (data ?? []).map((row) => row.data as ResearchPage);

  const output = `// AUTO-GENERATED — do not edit manually
// Run: pnpm generate-research-snapshot
import type { ResearchPage } from "@/lib/research/types";

export const RESEARCH_PAGES_SNAPSHOT: ResearchPage[] = ${JSON.stringify(pages, null, 2)};
`;

  fs.writeFileSync(outFile, output, "utf8");
  console.log(`Generated research snapshot for ${pages.length} pages → lib/research/generated/pages-snapshot.ts`);
}

main();
