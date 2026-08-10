import { describe, expect, it } from "vitest";
import { storeMedia } from "@/lib/media";
describe("validación de archivos", () => {
  it("rechaza contenido que no coincide con una imagen", async () => {
    const file = new File(["contenido ejecutable"], "foto.png", { type: "image/png" });
    await expect(storeMedia(file, "image")).rejects.toThrow(/Tipo de imagen/);
  });
  it("rechaza archivos demasiado grandes antes de escribirlos", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" });
    await expect(storeMedia(file, "image")).rejects.toThrow(/tamaño permitido/);
  });
});
