import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { removeMedia, storeMedia } from "@/lib/media";
import { requireAdminApi } from "@/lib/security";
import { normalizeForSearch } from "@/lib/spanish";
import { buildWordConfigurations, parseWordForm } from "@/lib/word-form";
import { validateSyllables } from "@/lib/learning-activities";

const schema = z.union([
  z.object({ active: z.boolean() }),
  z.object({ syllables: z.array(z.string().trim().min(1).max(40)).max(4) })
]);

async function removeIfUnreferenced(relativePath: string | null, kind: "image" | "audio") {
  if (!relativePath) return;
  const references = await prisma.word.count({
    where: kind === "audio" ? { audioPath: relativePath } : { imagePath: relativePath }
  });
  if (references === 0) await removeMedia(relativePath);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      const input = schema.parse(await request.json());
      if ("syllables" in input) {
        const syllableCheck = validateSyllables(word.text, input.syllables);
        if (input.syllables.length && !syllableCheck.eligible)
          throw new Error(syllableCheck.error);
        return NextResponse.json(
          await prisma.word.update({
            where: { id },
            data: { syllables: input.syllables.length ? syllableCheck.syllables : [] },
            include: { category: true, configurations: { where: { active: true } } }
          })
        );
      }
      return NextResponse.json(await prisma.word.update({ where: { id }, data: input }));
    }

    const form = await request.formData();
    const input = parseWordForm(form);
    const { text, configurations } = buildWordConfigurations(input);
    const syllableCheck = validateSyllables(text, input.syllables);
    if (input.syllables.length && !syllableCheck.eligible) throw new Error(syllableCheck.error);
    const imageFile = form.get("image");
    const audioFile = form.get("audio");
    const removeAudio = form.get("removeAudio") === "true";
    let storedImage: Awaited<ReturnType<typeof storeMedia>> = null;
    let storedAudio: Awaited<ReturnType<typeof storeMedia>> = null;
    try {
      storedImage = imageFile instanceof File ? await storeMedia(imageFile, "image") : null;
      storedAudio = audioFile instanceof File ? await storeMedia(audioFile, "audio") : null;
      const updated = await prisma.$transaction(async (tx) => {
        await tx.exerciseConfiguration.updateMany({
          where: { wordId: id },
          data: { active: false }
        });
        return tx.word.update({
          where: { id },
          data: {
            text,
            normalizedText: normalizeForSearch(text),
            categoryId: input.categoryId,
            difficulty: input.difficulty,
            syllables: syllableCheck.syllables,
            imagePath: storedImage?.path ?? word.imagePath,
            imageMime: storedImage?.mime ?? word.imageMime,
            audioPath: storedAudio?.path ?? (removeAudio ? null : word.audioPath),
            audioMime: storedAudio?.mime ?? (removeAudio ? null : word.audioMime),
            configurations: { create: configurations }
          },
          include: { category: true, configurations: { where: { active: true } } }
        });
      });
      if (storedImage && word.imagePath)
        await removeIfUnreferenced(word.imagePath, "image").catch(() => {});
      if ((storedAudio || removeAudio) && word.audioPath)
        await removeIfUnreferenced(word.audioPath, "audio").catch(() => {});
      return NextResponse.json(updated);
    } catch (error) {
      await Promise.all([removeMedia(storedImage?.path), removeMedia(storedAudio?.path)]);
      throw error;
    }
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        error: unauthorized
          ? "No autorizado"
          : error instanceof Error
            ? error.message
            : "Solicitud inválida"
      },
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
      data: {
        active: false,
        deletedAt: new Date(),
        imagePath: null,
        imageMime: null,
        audioPath: null,
        audioMime: null
      }
    });
    await Promise.all([
      removeIfUnreferenced(word.imagePath, "image").catch(() => {}),
      removeIfUnreferenced(word.audioPath, "audio").catch(() => {})
    ]);
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "No se pudo eliminar la palabra" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
