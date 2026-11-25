import { z } from "zod/v4";
import { readSiteGlobalConfigItem, siteGlobalConfigWriter } from "./site-global-config";

const KEY = "public_emergency_notice";

export const emergencyNoticeSchema = z.object({
  message: z.string().trim().min(1).max(240),
  expiresAt: z.iso.datetime({ offset: true }),
}).strict();

export type EmergencyNotice = z.infer<typeof emergencyNoticeSchema>;

export async function readEmergencyNotice(): Promise<EmergencyNotice | null> {
  const item = await readSiteGlobalConfigItem(KEY);
  if (item == null) return null;
  const notice = emergencyNoticeSchema.parse(item);
  return Date.parse(notice.expiresAt) > Date.now() ? notice : null;
}

export async function publishEmergencyNotice(notice: EmergencyNotice | null) {
  const write = siteGlobalConfigWriter();
  if (!write) throw new Error("Emergency notice Global Config is missing");
  await write(KEY, notice);
}
