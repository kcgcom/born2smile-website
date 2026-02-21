import { NextResponse } from "next/server";
import {
  verifyAdminRequest,
  unauthorizedResponse,
} from "@/app/api/admin/_lib/auth";
import { ENV_VARIABLES } from "@/lib/dev-data";

export async function GET(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const variables = ENV_VARIABLES.map((v) => ({
    key: v.key,
    label: v.label,
    configured: !!process.env[v.key]?.trim(),
    required: v.required,
    scope: v.scope,
  }));

  const configured = variables.filter((v) => v.configured).length;

  return NextResponse.json(
    {
      data: {
        variables,
        summary: {
          total: variables.length,
          configured,
          missing: variables.length - configured,
        },
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    },
  );
}
