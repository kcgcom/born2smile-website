import fs from "node:fs";
import path from "node:path";
import { formatClinicPhoneInput } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const TABLE = "site_config";
const TYPE = "clinic";
const UPDATED_BY = "script:migrate-clinic-phone-single-source";

function loadEnvFile(filename: string) {
  const cwd = process.cwd();
  const filePath = path.join(cwd, filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) continue;

    const key = line.slice(0, equalIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const rawValue = line.slice(equalIndex + 1).trim();
    const unquoted = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = unquoted;
  }
}

function loadEnv() {
  loadEnvFile(".env");
  loadEnvFile(".env.local");
}

function sanitizeClinicData(data: Record<string, unknown>) {
  const next = { ...data };
  const phone = typeof next.phone === "string" ? formatClinicPhoneInput(next.phone) : "";

  if (phone) {
    next.phone = phone;
  }

  delete next.phoneIntl;
  delete next.phoneHref;
  return next;
}

async function main() {
  loadEnv();

  const apply = process.argv.includes("--apply");
  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("type", TYPE)
    .single();

  if (error) {
    throw error;
  }

  if (!row?.data || typeof row.data !== "object") {
    console.log("[clinic-phone-migration] clinic 설정 데이터가 없어 종료합니다.");
    return;
  }

  const current = row.data as Record<string, unknown>;
  const next = sanitizeClinicData(current);

  const changed = JSON.stringify(current) !== JSON.stringify(next);

  console.log("[clinic-phone-migration] current keys:", Object.keys(current).sort().join(", "));
  console.log("[clinic-phone-migration] next keys:", Object.keys(next).sort().join(", "));
  console.log("[clinic-phone-migration] phone:", String(current.phone ?? ""), "→", String(next.phone ?? ""));

  if (!changed) {
    console.log("[clinic-phone-migration] 변경할 내용이 없습니다.");
    return;
  }

  if (!apply) {
    console.log("[clinic-phone-migration] 드라이런 완료. 실제 반영하려면 --apply를 붙이세요.");
    return;
  }

  const { error: updateError } = await supabase
    .from(TABLE)
    .update({
      data: next,
      updated_at: new Date().toISOString(),
      updated_by: UPDATED_BY,
    })
    .eq("type", TYPE);

  if (updateError) {
    throw updateError;
  }

  console.log("[clinic-phone-migration] clinic 설정의 레거시 전화 필드를 정리했습니다.");
}

main().catch((error) => {
  console.error("[clinic-phone-migration] 실패", error);
  process.exitCode = 1;
});
