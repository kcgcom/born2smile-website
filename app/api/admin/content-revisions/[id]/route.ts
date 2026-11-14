import { z } from "zod/v4";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import { getContentRevision, REVISION_HEADERS, revisionResult, revisionUnavailable } from "@/lib/content-revisions-server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "INVALID_ID" }, { status: 400, headers: REVISION_HEADERS });
  try {
    const data = await getContentRevision(id);
    return data ? Response.json({ data }, { headers: REVISION_HEADERS }) : revisionResult({ status: "not_found" });
  } catch { return revisionUnavailable(); }
}
