import { unstable_cache, revalidateTag, unstable_noStore as noStore } from "next/cache";
import { localSiteConfig, assertLiveSiteConfigWrite } from "./site-config-local";
import { getSupabaseAdmin } from "./supabase-admin";
import { CLINIC_BASE, LINKS, HOURS, enrichClinicWithContact, type ClinicContactFields } from "./constants";

const TABLE = "site_config";
const CACHE_TAG_LINKS = "site-config-links";
const CACHE_TAG_CLINIC = "site-config-clinic";
const CACHE_TAG_HOURS = "site-config-hours";
const CACHE_TAG_SCHEDULE = "site-config-schedule";
const CACHE_TTL = 3600; // 1 hour
const SITE_LINK_KEYS = ["kakaoChannel", "instagram", "naverBlog", "naverMap", "kakaoMap"] as const;

function safeRevalidateTag(tag: string) {
  try {
    revalidateTag(tag, "max");
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

export type SiteSchedule = {
  publishDays: number[]; // 0=일, 1=월, ..., 6=토
};

// =============================================================
// Read Functions
// =============================================================

const getSiteLinksLive = unstable_cache(
  async (): Promise<SiteLinks> => {
    const defaults: SiteLinks = { ...LINKS };
    const { data: row, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("data")
      .eq("type", "links")
      .maybeSingle();
    if (error) throw new Error("Site config links read failed");
    if (!row?.data) return defaults;
    return { ...defaults, ...pickSiteLinks(row.data as Record<string, unknown>) };
  },
  [CACHE_TAG_LINKS],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_LINKS] },
);

const getSiteClinicDraftLive = unstable_cache(
  async (): Promise<SiteClinic> => {
    const defaults: SiteClinic = { ...CLINIC_BASE };
    const { data: row, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("data")
      .eq("type", "clinic")
      .maybeSingle();
    if (error) throw new Error("Site config clinic read failed");
    if (!row?.data) return defaults;
    const rest = stripLegacyClinicContactFields(row.data as Partial<SiteClinic & Partial<ClinicContactFields>>);
    return { ...defaults, ...rest };
  },
  [CACHE_TAG_CLINIC],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_CLINIC] },
);

const getSiteClinicLive = unstable_cache(
  async (): Promise<ResolvedSiteClinic> => enrichClinicWithContact(await getSiteClinicDraftLive()),
  [`${CACHE_TAG_CLINIC}-resolved`],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_CLINIC] },
);

const getSiteHoursLive = unstable_cache(
  async (): Promise<SiteHours> => {
    const defaults: SiteHours = {
      schedule: HOURS.schedule.map((s) => ({ ...s })),
      exceptions: HOURS.exceptions.map((exception) => ({ ...exception })),
      lunchTime: HOURS.lunchTime,
      closedDays: HOURS.closedDays,
      notice: HOURS.notice,
    };
    const { data: row, error } = await getSupabaseAdmin()
      .from(TABLE)
      .select("data")
      .eq("type", "hours")
      .maybeSingle();
    if (error) throw new Error("Site config hours read failed");
    if (!row?.data) return defaults;
    return { ...defaults, ...(row.data as Partial<SiteHours>) };
  },
  [CACHE_TAG_HOURS],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_HOURS] },
);

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
  const { data: current, error: readError } = await admin
    .from(TABLE)
    .select("data")
    .eq("type", "hours")
    .maybeSingle();
  if (readError) throw readError;
  const merged = { ...(current?.data ?? {}), ...data };
  const { error: writeError } = await admin
    .from(TABLE)
    .upsert({
      type: "hours",
      data: merged,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    }, { onConflict: "type" });
  if (writeError) throw writeError;
  safeRevalidateTag(CACHE_TAG_HOURS);
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

export async function getSiteLinks(): Promise<SiteLinks> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("links", getSiteLinksLive, () => ({ ...LINKS }))
    : { ...LINKS, ...local.links };
}

export async function getSiteClinicDraft(): Promise<SiteClinic> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("clinic", getSiteClinicDraftLive, () => ({ ...CLINIC_BASE }))
    : { ...CLINIC_BASE, ...local.clinic };
}

export async function getSiteClinic(): Promise<ResolvedSiteClinic> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("clinic", getSiteClinicLive, () => enrichClinicWithContact({ ...CLINIC_BASE }))
    : enrichClinicWithContact({ ...CLINIC_BASE, ...local.clinic });
}

export async function getSiteHours(): Promise<SiteHours> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("hours", getSiteHoursLive, defaultSiteHours)
    : { ...defaultSiteHours(), ...local.hours };
}

export async function getSiteSchedule(): Promise<SiteSchedule> {
  const local = localSiteConfig();
  return local === null
    ? readLiveOrDefaults("schedule", getSiteScheduleLive, () => ({ ...DEFAULT_SCHEDULE }))
    : { ...DEFAULT_SCHEDULE, ...local.schedule };
}
