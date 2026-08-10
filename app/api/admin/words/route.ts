import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeMedia, storeMedia } from "@/lib/media";
import { requireAdminApi } from "@/lib/security";
import { normalizeForSearch } from "@/lib/spanish";
import { buildWordConfigurations, parseWordForm } from "@/lib/word-form";

export async function GET() {
  try {
    await requireAdminApi();
    return NextResponse.json(
      await prisma.word.findMany({
        where: { deletedAt: null },
        include: { category: true, configurations: { where: { active: true } } },
        orderBy: { createdAt: "desc" }
      })
    );
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const form = await request.formData();
    const input = parseWordForm(form);
    const { text, configurations } = buildWordConfigurations(input);
    const image = form.get("image");
    const audio = form.get("audio");
    let storedImage: Awaited<ReturnType<typeof storeMedia>> = null;
    let storedAudio: Awaited<ReturnType<typeof storeMedia>> = null;
    try {
      storedImage = image instanceof File ? await storeMedia(image, "image") : null;
      storedAudio = audio instanceof File ? await storeMedia(audio, "audio") : null;
      const word = await prisma.word.create({
        data: {
          text,
          normalizedText: normalizeForSearch(text),
          categoryId: input.categoryId,
          difficulty: input.difficulty,
          imagePath: storedImage?.path,
          imageMime: storedImage?.mime,
          audioPath: storedAudio?.path,
          audioMime: storedAudio?.mime,
          configurations: { create: configurations }
        },
        include: { category: true, configurations: { where: { active: true } } }
      });
      return NextResponse.json(word, { status: 201 });
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
            : "Datos inválidos"
      },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
