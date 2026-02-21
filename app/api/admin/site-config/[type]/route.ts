import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminRequest, unauthorizedResponse } from "../../_lib/auth";
import {
  getSiteLinks,
  getSiteClinic,
  getSiteHours,
  updateSiteLinks,
  updateSiteClinic,
  updateSiteHours,
} from "@/lib/site-config-firestore";
import {
  siteLinksSchema,
  siteClinicSchema,
  siteHoursSchema,
} from "@/lib/blog-validation";

const VALID_TYPES = ["links", "clinic", "hours"] as const;
type ConfigType = (typeof VALID_TYPES)[number];

function isValidType(type: string): type is ConfigType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

const CACHE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { type } = await params;
  if (!isValidType(type)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 타입입니다 (links, clinic, hours)" },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  try {
    let config;
    if (type === "links") config = await getSiteLinks();
    else if (type === "clinic") config = await getSiteClinic();
    else config = await getSiteHours();

    return Response.json({ data: config }, { headers: CACHE_HEADERS });
  } catch (e) {
    const message = e instanceof Error ? e.message : "사이트 설정을 불러올 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: CACHE_HEADERS },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return unauthorizedResponse(auth);

  const { type } = await params;
  if (!isValidType(type)) {
    return Response.json(
      { error: "BAD_REQUEST", message: "유효하지 않은 타입입니다 (links, clinic, hours)" },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "BAD_REQUEST", message: "요청 본문을 파싱할 수 없습니다" },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  try {
    let validated;
    if (type === "links") {
      validated = siteLinksSchema.parse(body);
      await updateSiteLinks(validated, auth.email);
    } else if (type === "clinic") {
      validated = siteClinicSchema.parse(body);
      await updateSiteClinic(validated, auth.email);
    } else {
      validated = siteHoursSchema.parse(body);
      await updateSiteHours(validated, auth.email);
    }

    revalidatePath("/");
    revalidatePath("/about");
    revalidatePath("/contact");

    return Response.json(
      { data: { type, updated: true } },
      { status: 200, headers: CACHE_HEADERS },
    );
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return Response.json(
        { error: "VALIDATION_ERROR", message: e.message },
        { status: 400, headers: CACHE_HEADERS },
      );
    }
    const message = e instanceof Error ? e.message : "사이트 설정을 업데이트할 수 없습니다";
    return Response.json(
      { error: "API_ERROR", message },
      { status: 500, headers: CACHE_HEADERS },
    );
  }
}
