import { siteHoursSchema } from "./blog-validation";
import type { SiteHours } from "./site-config-supabase";

const KEY = "public_clinic_hours";

function connection() {
  const value = process.env.SITE_HOURS_GLOBAL_CONFIG || process.env.GLOBAL_CONFIG;
  if (!value) return null;

  const url = new URL(value);
  const id = url.pathname.slice(1);
  const token = url.searchParams.get("token");
  if (url.origin !== "https://global-config.vercel.com" || !/^ecfg_[a-zA-Z0-9]+$/.test(id) || !token) {
    throw new Error("Invalid clinic hours Global Config connection");
  }
  return { id, token };
}

export async function readGlobalConfigHours(): Promise<SiteHours | null> {
  const config = connection();
  if (!config) return null;

  const response = await fetch(`https://global-config.vercel.com/${config.id}/items`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Clinic hours Global Config read failed (${response.status})`);

  const items = await response.json();
  return siteHoursSchema.parse(items[KEY]);
}

export async function syncGlobalConfigHours(
  readCurrent: () => Promise<{ hours: SiteHours; version: string }>,
): Promise<boolean> {
  const config = connection();
  if (!config) return false;

  const token = process.env.SITE_HOURS_GLOBAL_CONFIG_WRITE_TOKEN;
  if (!token) throw new Error("Clinic hours Global Config write token is missing");

  const url = new URL(`https://api.vercel.com/v1/global-config/${config.id}/items`);
  const teamId = process.env.SITE_HOURS_GLOBAL_CONFIG_TEAM_ID;
  if (teamId) url.searchParams.set("teamId", teamId);

  let current = await readCurrent();
  // If another save raced this write, publish the newer database value.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key: KEY, value: current.hours }] }),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Clinic hours Global Config write failed (${response.status})`);

    const latest = await readCurrent();
    if (latest.version === current.version) return true;
    current = latest;
  }
  throw new Error("Clinic hours changed during Global Config synchronization");
}
