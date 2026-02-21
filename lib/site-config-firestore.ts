import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { unstable_cache, revalidateTag } from "next/cache";
import { getAdminApp } from "./firebase-admin";
import { CLINIC, LINKS, HOURS } from "./constants";

const COLLECTION = "site-config";
const CACHE_TAG_LINKS = "site-config-links";
const CACHE_TAG_CLINIC = "site-config-clinic";
const CACHE_TAG_HOURS = "site-config-hours";
const CACHE_TAG_SCHEDULE = "site-config-schedule";
const CACHE_TTL = 3600; // 1 hour

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
  phoneIntl: string;
  phoneHref: string;
  address: string;
  addressShort: string;
  neighborhood: string;
  businessNumber: string;
  representative: string;
};

export type SiteHours = {
  schedule: Array<{ day: string; time: string; open: boolean; note?: string }>;
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

export const getSiteLinks = unstable_cache(
  async (): Promise<SiteLinks> => {
    const db = getFirestore(getAdminApp());
    const doc = await db.collection(COLLECTION).doc("links").get();
    const defaults: SiteLinks = { ...LINKS };
    if (!doc.exists) return defaults;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, updatedBy, ...fields } = doc.data() as Record<string, unknown> & { updatedAt?: Timestamp; updatedBy?: string };
    return { ...defaults, ...(fields as Partial<SiteLinks>) };
  },
  [CACHE_TAG_LINKS],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_LINKS] },
);

export const getSiteClinic = unstable_cache(
  async (): Promise<SiteClinic> => {
    const db = getFirestore(getAdminApp());
    const doc = await db.collection(COLLECTION).doc("clinic").get();
    const defaults: SiteClinic = { ...CLINIC };
    if (!doc.exists) return defaults;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, updatedBy, ...fields } = doc.data() as Record<string, unknown> & { updatedAt?: Timestamp; updatedBy?: string };
    return { ...defaults, ...(fields as Partial<SiteClinic>) };
  },
  [CACHE_TAG_CLINIC],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_CLINIC] },
);

export const getSiteHours = unstable_cache(
  async (): Promise<SiteHours> => {
    const db = getFirestore(getAdminApp());
    const doc = await db.collection(COLLECTION).doc("hours").get();
    const defaults: SiteHours = {
      schedule: HOURS.schedule.map((s) => ({ ...s })),
      lunchTime: HOURS.lunchTime,
      closedDays: HOURS.closedDays,
      notice: HOURS.notice,
    };
    if (!doc.exists) return defaults;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, updatedBy, ...fields } = doc.data() as Record<string, unknown> & { updatedAt?: Timestamp; updatedBy?: string };
    return { ...defaults, ...(fields as Partial<SiteHours>) };
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
  const db = getFirestore(getAdminApp());
  await db
    .collection(COLLECTION)
    .doc("links")
    .set({ ...data, updatedAt: Timestamp.now(), updatedBy }, { merge: true });
  revalidateTag(CACHE_TAG_LINKS, "max");
}

export async function updateSiteClinic(
  data: Partial<SiteClinic>,
  updatedBy: string,
): Promise<void> {
  const db = getFirestore(getAdminApp());
  await db
    .collection(COLLECTION)
    .doc("clinic")
    .set({ ...data, updatedAt: Timestamp.now(), updatedBy }, { merge: true });
  revalidateTag(CACHE_TAG_CLINIC, "max");
}

export async function updateSiteHours(
  data: Partial<SiteHours>,
  updatedBy: string,
): Promise<void> {
  const db = getFirestore(getAdminApp());
  await db
    .collection(COLLECTION)
    .doc("hours")
    .set({ ...data, updatedAt: Timestamp.now(), updatedBy }, { merge: true });
  revalidateTag(CACHE_TAG_HOURS, "max");
}

// =============================================================
// Schedule (Publish Schedule)
// =============================================================

const DEFAULT_SCHEDULE: SiteSchedule = { publishDays: [1, 3, 5] }; // 월, 수, 금

export const getSiteSchedule = unstable_cache(
  async (): Promise<SiteSchedule> => {
    const db = getFirestore(getAdminApp());
    const doc = await db.collection(COLLECTION).doc("schedule").get();
    if (!doc.exists) return { ...DEFAULT_SCHEDULE };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, updatedBy, ...fields } = doc.data() as Record<string, unknown> & { updatedAt?: Timestamp; updatedBy?: string };
    return { ...DEFAULT_SCHEDULE, ...(fields as Partial<SiteSchedule>) };
  },
  [CACHE_TAG_SCHEDULE],
  { revalidate: CACHE_TTL, tags: [CACHE_TAG_SCHEDULE] },
);

export async function updateSiteSchedule(
  data: SiteSchedule,
  updatedBy: string,
): Promise<void> {
  const db = getFirestore(getAdminApp());
  await db
    .collection(COLLECTION)
    .doc("schedule")
    .set({ ...data, updatedAt: Timestamp.now(), updatedBy }, { merge: true });
  revalidateTag(CACHE_TAG_SCHEDULE, "max");
}
