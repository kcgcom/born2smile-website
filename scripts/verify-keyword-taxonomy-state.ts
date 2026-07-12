import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 관리자 환경변수가 없습니다.");

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [{ data: versions, error: versionError }, { data: searchPointer, error: searchError }, { data: datalabPointer, error: datalabError }, { data: latestJob, error: jobError }] = await Promise.all([
    admin.from("keyword_taxonomy_versions").select("version,status,taxonomy,created_at").in("status", ["active", "pending"]).order("version"),
    admin.from("searchad_snapshot_pointer").select("searchad_snapshots(taxonomy_version,created_at)").eq("singleton", true).maybeSingle(),
    admin.from("datalab_snapshot_pointer").select("datalab_snapshots(taxonomy_version,created_at)").eq("singleton", true).maybeSingle(),
    admin.from("searchad_sync_jobs").select("id,status,taxonomy_version,candidate_analysis_status,candidate_analysis_error,created_at,completed_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (versionError) throw versionError;
  if (searchError) throw searchError;
  if (datalabError) throw datalabError;
  if (jobError) throw jobError;

  const active = versions?.filter((item) => item.status === "active") ?? [];
  const pending = versions?.filter((item) => item.status === "pending") ?? [];
  const searchSnapshot = searchPointer?.searchad_snapshots as unknown as { taxonomy_version: number | null; created_at: string } | null;
  const datalabSnapshot = datalabPointer?.datalab_snapshots as unknown as { taxonomy_version: number | null; created_at: string } | null;
  const errors: string[] = [];

  if (active.length !== 1) errors.push(`활성 택소노미가 ${active.length}개입니다.`);
  if (pending.length > 1) errors.push(`대기 택소노미가 ${pending.length}개입니다.`);
  const activeVersion = active[0]?.version ?? null;
  if (!searchSnapshot) errors.push("활성 SearchAd 스냅샷이 없습니다.");
  if (!datalabSnapshot) errors.push("활성 DataLab 스냅샷이 없습니다.");
  if (activeVersion !== searchSnapshot?.taxonomy_version) errors.push(`택소노미 v${activeVersion}와 SearchAd v${searchSnapshot?.taxonomy_version ?? "없음"}가 다릅니다.`);
  if (activeVersion !== datalabSnapshot?.taxonomy_version) errors.push(`택소노미 v${activeVersion}와 DataLab v${datalabSnapshot?.taxonomy_version ?? "없음"}가 다릅니다.`);

  const { validateKeywordTaxonomy } = await import("../lib/admin-keyword-taxonomy");
  for (const version of versions ?? []) validateKeywordTaxonomy(version.taxonomy);

  console.log(JSON.stringify({
    ok: errors.length === 0,
    activeTaxonomyVersion: activeVersion,
    pendingTaxonomyVersion: pending[0]?.version ?? null,
    searchAdSnapshot: searchSnapshot,
    dataLabSnapshot: datalabSnapshot,
    latestJob,
    errors,
  }, null, 2));
  if (errors.length > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
