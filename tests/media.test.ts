import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { removeMedia, storeMedia } from "@/lib/media";

const temporaryRoots: string[] = [];

async function temporaryMediaRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "yomu-media-test-"));
  temporaryRoots.push(root);
  process.env.MEDIA_ROOT = root;
  return root;
}

afterEach(async () => {
  delete process.env.MEDIA_ROOT;
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});
describe("validación de archivos", () => {
  it("rechaza contenido que no coincide con una imagen", async () => {
    const file = new File(["contenido ejecutable"], "foto.png", { type: "image/png" });
    await expect(storeMedia(file, "image")).rejects.toThrow(/Tipo de imagen/);
  });
  it("rechaza archivos demasiado grandes antes de escribirlos", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" });
    await expect(storeMedia(file, "image")).rejects.toThrow(/tamaño permitido/);
  });
  it("guarda un MP3 válido con nombre UUID y permite retirarlo", async () => {
    const root = await temporaryMediaRoot();
    const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0]);
    const stored = await storeMedia(new File([bytes], "vaca.mp3", { type: "audio/mpeg" }), "audio");
    expect(stored).toMatchObject({ mime: "audio/mpeg" });
    expect(stored?.path).toMatch(/^audios\/[0-9a-f-]{36}\.mp3$/);
    await expect(readFile(path.join(root, stored!.path))).resolves.toEqual(Buffer.from(bytes));
    await removeMedia(stored!.path);
    await expect(readFile(path.join(root, stored!.path))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rechaza extensión o MIME que no sean MP3", async () => {
    const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]);
    await expect(
      storeMedia(new File([bytes], "audio.wav", { type: "audio/mpeg" }), "audio")
    ).rejects.toThrow(/extensión/i);
    await expect(
      storeMedia(new File([bytes], "audio.mp3", { type: "application/octet-stream" }), "audio")
    ).rejects.toThrow(/MIME/);
  });

  it("rechaza MP3 mayores de 5 MB", async () => {
    await expect(
      storeMedia(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "audio.mp3", { type: "audio/mpeg" }),
        "audio"
      )
    ).rejects.toThrow(/permitido/);
  });
});
