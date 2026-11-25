import { readEmergencyNotice } from "@/lib/emergency-notice";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json({ notice: await readEmergencyNotice() }, { headers });
  } catch {
    return Response.json({ notice: null }, { status: 503, headers });
  }
}
