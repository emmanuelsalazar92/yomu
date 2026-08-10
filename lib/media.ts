import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { MEDIA_LIMITS } from "@/lib/constants";

const extensionForMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/mp4": "m4a"
};
export function mediaRoot() {
  return path.resolve(
    process.env.MEDIA_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), "uploads")
  );
}

export async function storeMedia(
  file: File,
  kind: "image" | "audio"
): Promise<{ path: string; mime: string } | null> {
  if (!file.size) return null;
  if (kind === "audio" && file.type !== "audio/mpeg")
    throw new Error("El audio debe declarar el tipo MIME audio/mpeg");
  const limit = kind === "image" ? MEDIA_LIMITS.imageBytes : MEDIA_LIMITS.audioBytes;
  if (file.size > limit)
    throw new Error(`${kind === "image" ? "La imagen" : "El audio"} supera el tamaño permitido`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  const allowed: readonly string[] =
    kind === "image" ? MEDIA_LIMITS.imageMime : MEDIA_LIMITS.audioMime;
  if (!detected || !allowed.includes(detected.mime) || !extensionForMime[detected.mime])
    throw new Error(`Tipo de ${kind === "image" ? "imagen" : "audio"} no permitido`);
  const originalExtension = path.extname(file.name).slice(1).toLowerCase();
  const safeExtensions =
    detected.mime === "image/jpeg" ? ["jpg", "jpeg"] : [extensionForMime[detected.mime]];
  if (!safeExtensions.includes(originalExtension))
    throw new Error("La extensión no coincide con el contenido del archivo");
  const relative = `${kind}s/${randomUUID()}.${extensionForMime[detected.mime]}`;
  const target = path.join(mediaRoot(), relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer, { flag: "wx" });
  return { path: relative.replaceAll("\\", "/"), mime: detected.mime };
}

export async function removeMedia(relativePath: string | null | undefined) {
  if (!relativePath) return;
  const root = mediaRoot();
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(root + path.sep)) throw new Error("Ruta de archivo no permitida");
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
