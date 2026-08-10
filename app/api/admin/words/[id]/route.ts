import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storeMedia } from "@/lib/media";
import { requireAdminApi } from "@/lib/security";
import { normalizeForSearch, spanishUpper } from "@/lib/spanish";
import { buildWordConfigurations } from "@/lib/word-configurations";

const schema = z.object({ active: z.boolean() });
const editSchema = z.object({
  text: z.string().min(1).max(40),
  categoryId: z.uuid(),
  difficulty: z.coerce.number().int().min(1).max(5),
  vowelPositions: z.array(z.number().int().min(0)),
  consonantPositions: z.array(z.number().int().min(0)),
  exerciseTypes: z
    .array(z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "SINGLE_CONSONANT"]))
    .min(1)
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const input = editSchema.parse({
        text: form.get("text"),
        categoryId: form.get("categoryId"),
        difficulty: form.get("difficulty") || 1,
        vowelPositions: JSON.parse(String(form.get("vowelPositions") || "[]")),
        consonantPositions: JSON.parse(String(form.get("consonantPositions") || "[]")),
        exerciseTypes: JSON.parse(String(form.get("exerciseTypes") || "[]"))
      });
      const current = await prisma.word.findFirst({ where: { id, deletedAt: null } });
      if (!current) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
      const text = spanishUpper(input.text);
      const configurations = buildWordConfigurations({ ...input, text });
      const image = form.get("image");
      const audio = form.get("audio");
      const storedImage =
        image instanceof File && image.size ? await storeMedia(image, "image") : null;
      const storedAudio =
        audio instanceof File && audio.size ? await storeMedia(audio, "audio") : null;
      const word = await prisma.$transaction(async (tx) => {
        await tx.exerciseConfiguration.updateMany({
          where: { wordId: id, active: true },
          data: { active: false }
        });
        return tx.word.update({
          where: { id },
          data: {
            text,
            normalizedText: normalizeForSearch(text),
            categoryId: input.categoryId,
            difficulty: input.difficulty,
            ...(storedImage ? { imagePath: storedImage.path, imageMime: storedImage.mime } : {}),
            ...(storedAudio ? { audioPath: storedAudio.path, audioMime: storedAudio.mime } : {}),
            configurations: { create: configurations }
          },
          include: { category: true, configurations: { where: { active: true } } }
        });
      });
      return NextResponse.json(word);
    }
    const input = schema.parse(await request.json());
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
    return NextResponse.json(await prisma.word.update({ where: { id }, data: input }));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "Solicitud inválida" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
    await prisma.word.update({
      where: { id },
      data: { active: false, deletedAt: new Date() }
    });
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "No se pudo eliminar la palabra" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
