import { cache } from "react";
import { unstable_cache, revalidateTag, unstable_noStore as noStore } from "next/cache";
import { localSiteConfig, assertLiveSiteConfigWrite, readSiteConfigSnapshot } from "./site-config-local";
import { getTodayKST } from "./date";
import { getSupabaseAdmin } from "./supabase-admin";
import { CLINIC_BASE, LINKS, HOURS, enrichClinicWithContact, type ClinicContactFields } from "./constants";

const TABLE = "site_config";
const CACHE_TAG_LINKS = "site-config-links";
const CACHE_TAG_CLINIC = "site-config-clinic";
const CACHE_TAG_HOURS = "site-config-hours";
const CACHE_TAG_SCHEDULE = "site-config-schedule";
const SITE_CONFIG_CACHE_TAGS = {
  links: CACHE_TAG_LINKS,
  clinic: CACHE_TAG_CLINIC,
  hours: CACHE_TAG_HOURS,
  schedule: CACHE_TAG_SCHEDULE,
};

export function expireSiteConfigCache(type: keyof typeof SITE_CONFIG_CACHE_TAGS) {
  revalidateTag(SITE_CONFIG_CACHE_TAGS[type], { expire: 0 });
}
const CACHE_TTL = 3600; // 1 hour
const SITE_LINK_KEYS = ["kakaoChannel", "instagram", "naverBlog", "naverMap", "kakaoMap"] as const;

function safeRevalidateTag(tag: string, profile: Parameters<typeof revalidateTag>[1] = "max") {
  try {
    revalidateTag(tag, profile);
  } catch (error) {
    console.warn(`[site-config-supabase] failed to revalidate tag '${tag}'`, error);
  }
}

function stripLegacyClinicContactFields(
  clinic: Partial<SiteClinic & Partial<ClinicContactFields>>,
): Partial<SiteClinic> {
  const next = { ...clinic };
  delete (next as Partial<SiteClinic & Partial<ClinicContactFields>>).phoneIntl;
  delete (next as Partial<SiteClinic & Partial<ClinicContactFields>>).phoneHref;
  return next;
}

function pickSiteLinks(data: Record<string, unknown> | null | undefined): Partial<SiteLinks> {
  if (!data) return {};

  return SITE_LINK_KEYS.reduce<Partial<SiteLinks>>((acc, key) => {
    const value = data[key];
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

// =============================================================
// Type Definitions
// =============================================================

export type SiteLinks = {
  kakaoChannel: string;
  instagram: string;
  naverBlog: string;
  naverMap: string;
  kakaoMap: string;
};

export type SiteClinic = {
  name: string;
  nameEn: string;
  slogan: string;
  phone: string;
  address: string;
  addressShort: string;
  neighborhood: string;
  businessNumber: string;
  representative: string;
};

export type ResolvedSiteClinic = SiteClinic & ClinicContactFields;

export type SiteHours = {
  schedule: Array<{ day: string; time: string; open: boolean; note?: string }>;
  exceptions: Array<{ date: string; open: boolean; time: string; note?: string }>;
  lunchTime: string;
  closedDays: string;
  notice: string;
};

export type PublicSiteHours = SiteHours & { needsVisitConfirmation?: true };

export type SiteSchedule = {
  publishDays: number[]; // 0=일, 1=월, ..., 6=토
};

// =============================================================
// Read Functions
// =============================================================

const getPublicSiteConfigLive = cache(unstable_cache(
  async () => {
    const { data, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("type, data")
      .in("type", ["links", "clinic", "hours"]);
    if (error) throw new Error("Public site config read failed");

    const rows = Object.fromEntries(data.map((row) => [row.type, row.data]));
    return {
      links: { ...LINKS, ...pickSiteLinks(rows.links) },
      clinic: { ...CLINIC_BASE, ...stripLegacyClinicContactFields(rows.clinic ?? {}) },
      hours: { ...defaultSiteHours(), ...rows.hours },
    };
  },
  ["site-config-public"],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_LINKS, CACHE_TAG_CLINIC, CACHE_TAG_HOURS] },
));

// =============================================================
// Write Functions
// =============================================================

export async function updateSiteLinks(
  data: Partial<SiteLinks>,
  updatedBy: string,
): Promise<void> {
  assertLiveSiteConfigWrite();
  const admin = getSupabaseAdmin();
  const { data: current, error: readError } = await admin
    .from(TABLE)
    .select("data")
    .eq("type", "links")
    .maybeSingle();
  if (readError) throw readError;
  const merged = {
    ...LINKS,
    ...pickSiteLinks((current?.data ?? {}) as Record<string, unknown>),
    ...pickSiteLinks(data as Record<string, unknown>),
  };
  const { error: writeError } = await admin
    .from(TABLE)
    .upsert({
      type: "links",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: "type" });
  if (writeError) throw writeError;
  safeRevalidateTag(CACHE_TAG_LINKS);
}

export async function updateSiteClinic(
  data: Partial<SiteClinic>,
  updatedBy: string,
): Promise<void> {
  assertLiveSiteConfigWrite();
  const admin = getSupabaseAdmin();
  const { data: current, error: readError } = await admin
    .from(TABLE)
    .select("data")
    .eq("type", "clinic")
    .maybeSingle();
  if (readError) throw readError;
  const currentBase = stripLegacyClinicContactFields(
    (current?.data ?? {}) as Partial<SiteClinic & Partial<ClinicContactFields>>,
  );
  const merged = { ...currentBase, ...data };
  const { error: writeError } = await admin
    .from(TABLE)
    .upsert({
      type: "clinic",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: "type" });
  if (writeError) throw writeError;
  safeRevalidateTag(CACHE_TAG_CLINIC);
}

export async function updateSiteHours(
  data: Partial<SiteHours>,
  updatedBy: string,
): Promise<void> {
  assertLiveSiteConfigWrite();
  const admin = getSupabaseAdmin();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current, error: readError } = await admin
      .from(TABLE)
      .select("data, updated_at")
      .eq("type", "hours")
      .maybeSingle();
    if (readError) throw readError;

    // A staff exception edit must merge into the latest owner schedule.
    const previousTime = current ? Date.parse(current.updated_at) : 0;
    const change = {
      data: { ...(current?.data ?? {}), ...data },
      updated_at: new Date(Math.max(Date.now(), previousTime + 1)).toISOString(),
      updated_by: updatedBy,
    };
    const write = current
      ? admin.from(TABLE).update(change).eq("type", "hours").eq("updated_at", current.updated_at)
      : admin.from(TABLE).upsert({ type: "hours", ...change }, { onConflict: "type", ignoreDuplicates: true });
    const { data: updated, error: writeError } = await write.select("type").maybeSingle();
    if (writeError) throw writeError;
    if (updated) {
      safeRevalidateTag(CACHE_TAG_HOURS, { expire: 0 });
      return;
    }
  }
  throw new Error("다른 사용자가 진료시간을 수정 중입니다. 잠시 후 다시 저장해 주세요.");
}

// =============================================================
// Schedule (Publish Schedule)
// =============================================================

const DEFAULT_SCHEDULE: SiteSchedule = { publishDays: [1, 3, 5] }; // 월, 수, 금

const getSiteScheduleLive = unstable_cache(
  async (): Promise<SiteSchedule> => {
    const { data: row, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("data")
      .eq("type", "schedule")
      .maybeSingle();
    if (error) throw new Error("Site config schedule read failed");
    if (!row?.data) return { ...DEFAULT_SCHEDULE };
    return { ...DEFAULT_SCHEDULE, ...(row.data as Partial<SiteSchedule>) };
  },
  [CACHE_TAG_SCHEDULE],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_SCHEDULE] },
);

export async function updateSiteSchedule(
  data: SiteSchedule,
  updatedBy: string,
): Promise<void> {
  assertLiveSiteConfigWrite();
  const admin = getSupabaseAdmin();
  const { data: current, error: readError } = await admin
    .from(TABLE)
    .select("data")
    .eq("type", "schedule")
    .maybeSingle();
  if (readError) throw readError;
  const merged = { ...(current?.data ?? {}), ...data };
  const { error: writeError } = await admin
    .from(TABLE)
    .upsert({
      type: "schedule",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: "type" });
  if (writeError) throw writeError;
  safeRevalidateTag(CACHE_TAG_SCHEDULE);
}


// Fallbacks run outside unstable_cache: a transient database failure must not
// replace the persistent cache with code defaults. Existing stale values can
// still be served by Next during a failed background refresh.
async function readLiveOrDefaults<T>(type: string, read: () => Promise<T>, defaults: () => T): Promise<T> {
  try {
    return await read();
  } catch {
    noStore();
    console.error("[site-config] live read failed; using uncached defaults", { type });
    return defaults();
  }
}

function defaultSiteHours(): SiteHours {
  return {
    schedule: HOURS.schedule.map((item) => ({ ...item })),
    exceptions: HOURS.exceptions.map((item) => ({ ...item })),
    lunchTime: HOURS.lunchTime, closedDays: HOURS.closedDays, notice: HOURS.notice,
  };
}

export const getSiteLinks = cache(async (): Promise<SiteLinks> => {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("links", async () => (await getPublicSiteConfigLive()).links, () => ({ ...LINKS }))
    : { ...LINKS, ...local.links };
});

export const getSiteClinicDraft = cache(async (): Promise<SiteClinic> => {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("clinic", async () => (await getPublicSiteConfigLive()).clinic, () => ({ ...CLINIC_BASE }))
    : { ...CLINIC_BASE, ...local.clinic };
});

export const getSiteClinic = cache(async (): Promise<ResolvedSiteClinic> => {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("clinic", async () => enrichClinicWithContact((await getPublicSiteConfigLive()).clinic), () => enrichClinicWithContact({ ...CLINIC_BASE }))
    : enrichClinicWithContact({ ...CLINIC_BASE, ...local.clinic });
});

export const getSiteHoursDraft = cache(async (): Promise<SiteHours> => {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("hours", async () => (await getPublicSiteConfigLive()).hours, defaultSiteHours)
    : { ...defaultSiteHours(), ...local.hours };
});

export const getSiteHours = cache(async (): Promise<PublicSiteHours> => {
  const local = localSiteConfig();
  if (local !== null) return { ...defaultSiteHours(), ...local.hours };

  try {
    return (await getPublicSiteConfigLive()).hours;
  } catch {
    noStore();
    const hours = defaultSiteHours();
    try {
      Object.assign(hours, readSiteConfigSnapshot().hours);
    } catch {
      console.warn("[site-config] deployed hours snapshot unavailable; using code defaults");
    }
    const today = getTodayKST();
    return {
      ...hours,
      exceptions: hours.exceptions.filter(({ date }) => date >= today),
      needsVisitConfirmation: true,
    };
  }
});

export async function getSiteSchedule(): Promise<SiteSchedule> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("schedule", getSiteScheduleLive, () => ({ ...DEFAULT_SCHEDULE }))
    : { ...DEFAULT_SCHEDULE, ...local.schedule };
}
