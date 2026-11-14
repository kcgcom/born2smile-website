import { verifyAdminRequest, unauthorizedResponse } from "../../../_lib/auth";
import { getRevisionSource, REVISION_HEADERS, revisionUnavailable } from "@/lib/content-revisions-server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);
  const { slug } = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,200}[a-z0-9]$/.test(slug)) return Response.json({ error: "INVALID_SLUG" }, { status: 400, headers: REVISION_HEADERS });
  try {
    const data = await getRevisionSource(slug);
    return data ? Response.json({ data }, { headers: REVISION_HEADERS })
      : Response.json({ error: "NOT_FOUND" }, { status: 404, headers: REVISION_HEADERS });
  } catch { return revisionUnavailable(); }
}
