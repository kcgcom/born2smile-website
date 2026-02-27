import { NextResponse } from "next/server";
import { unauthorizedResponse, verifyAdminRequest } from "../_lib/auth";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  return NextResponse.json(
    { ok: true, email: auth.email },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    },
  );
}
