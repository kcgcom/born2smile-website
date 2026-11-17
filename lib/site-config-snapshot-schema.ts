import { z } from "zod";

// Only fields already used on public pages may enter a local snapshot.
const clinic = z.object({
  name: z.string(), nameEn: z.string(), slogan: z.string(), phone: z.string(),
  address: z.string(), addressShort: z.string(), neighborhood: z.string(),
  businessNumber: z.string(), representative: z.string(),
}).partial();
const links = z.object({
  kakaoChannel: z.string(), instagram: z.string(), naverBlog: z.string(),
  naverMap: z.string(), kakaoMap: z.string(),
}).partial();
const hours = z.object({
  schedule: z.array(z.object({ day: z.string(), time: z.string(), open: z.boolean(), note: z.string().optional() })),
  exceptions: z.array(z.object({ date: z.string(), time: z.string(), open: z.boolean(), note: z.string().optional() })),
  lunchTime: z.string(), closedDays: z.string(), notice: z.string(),
}).partial();
const schedule = z.object({ publishDays: z.array(z.number().int().min(0).max(6)) }).partial();

export const siteConfigDataSchema = z.object({ clinic, links, hours, schedule }).partial();
export const siteConfigSnapshotSchema = z.object({
  version: z.literal(1), fetchedAt: z.string().datetime(),
  sourceOrigin: z.string().url(), data: siteConfigDataSchema,
});
export type SiteConfigData = z.infer<typeof siteConfigDataSchema>;
export const SITE_CONFIG_SNAPSHOT_PATH = ".cache/site-config/snapshot.json";
export const SITE_CONFIG_MAX_AGE_MS = 60 * 60 * 1000;
