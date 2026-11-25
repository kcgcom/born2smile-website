import { isIP } from "node:net";
import { z } from "zod/v4";
import { forbidden, unauthorizedResponse, verifyAdminRequest } from "@/app/api/admin/_lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const input = z.object({ browserId: z.uuid(), deviceName: z.string().trim().max(60).optional() });

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  if (!auth.access || auth.email === "cli@admin") return unauthorizedResponse(forbidden());
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") : null;
  const { error } = await getSupabaseAdmin().rpc("record_admin_browser_presence", {
    p_email: auth.email.toLowerCase(),
    p_browser_id: parsed.data.browserId,
    p_device_name: parsed.data.deviceName || null,
    p_public_ip: ip && isIP(ip) ? ip : null,
  });
  return new Response(null, { status: error ? 503 : 204, headers: { "Cache-Control": "private, no-store" } });
}
