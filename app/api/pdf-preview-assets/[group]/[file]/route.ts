import { readFile } from "node:fs/promises";
import path from "node:path";

const ASSETS = {
  cmaps: { directory: "cmaps", filename: /^[\w-]+\.bcmap$/, contentType: "application/octet-stream" },
  standard_fonts: { directory: "standard_fonts", filename: /^[\w.-]+\.(?:pfb|ttf)$/, contentType: "application/octet-stream" },
  worker: { directory: "legacy/build", filename: /^pdf\.worker\.min\.mjs$/, contentType: "text/javascript; charset=utf-8" },
};

export async function GET(_request: Request, { params }: { params: Promise<{ group: string; file: string }> }) {
  const { group, file } = await params;
  if (!Object.hasOwn(ASSETS, group)) return new Response(null, { status: 404 });
  const asset = ASSETS[group as keyof typeof ASSETS];
  if (!asset.filename.test(file)) return new Response(null, { status: 404 });

  try {
    const bytes = await readFile(path.join(process.cwd(), "node_modules", "pdfjs-dist", asset.directory, file));
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": asset.contentType, "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return new Response(null, { status: 404 });
  }
}
