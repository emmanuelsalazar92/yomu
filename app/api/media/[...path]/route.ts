import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { mediaRoot } from "@/lib/media";
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const parts = (await params).path;
    if (parts.some((part) => part === ".." || part.includes("\\"))) throw new Error();
    const root = mediaRoot();
    const target = path.resolve(/* turbopackIgnore: true */ root, ...parts);
    if (!target.startsWith(root + path.sep)) throw new Error();
    const buffer = await readFile(target);
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || (!detected.mime.startsWith("image/") && !detected.mime.startsWith("audio/")))
      throw new Error();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": detected.mime,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline"
      }
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
