import { siteHoursSchema } from "./blog-validation";
import { readSiteGlobalConfigItem, siteGlobalConfigWriter } from "./site-global-config";
import type { SiteHours } from "./site-config-supabase";

const KEY = "public_clinic_hours";

export async function readGlobalConfigHours(): Promise<SiteHours | null> {
  const item = await readSiteGlobalConfigItem(KEY);
  return item === undefined ? null : siteHoursSchema.parse(item);
}

export async function syncGlobalConfigHours(
  readCurrent: () => Promise<{ hours: SiteHours; version: string }>,
): Promise<boolean> {
  const write = siteGlobalConfigWriter();
  if (!write) return false;

  let current = await readCurrent();
  // If another save raced this write, publish the newer database value.
  for (let attempt = 0; attempt < 3; attempt++) {
    await write(KEY, current.hours);

    const latest = await readCurrent();
    if (latest.version === current.version) return true;
    current = latest;
  }
  throw new Error("Clinic hours changed during Global Config synchronization");
}
