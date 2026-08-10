import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { storeMedia } from "@/lib/media";
import { requireAdminApi } from "@/lib/security";
import { normalizeForSearch, spanishUpper } from "@/lib/spanish";
import { buildWordConfigurations } from "@/lib/word-configurations";

const wordSchema = z.object({
  text: z.string().min(1).max(40),
  categoryId: z.uuid(),
  difficulty: z.coerce.number().int().min(1).max(5),
  vowelPositions: z.array(z.number().int().min(0)),
  consonantPositions: z.array(z.number().int().min(0)),
  exerciseTypes: z
    .array(z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "SINGLE_CONSONANT"]))
    .min(1)
});
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
    const input = wordSchema.parse({
      text: form.get("text"),
      categoryId: form.get("categoryId"),
      difficulty: form.get("difficulty") || 1,
      vowelPositions: JSON.parse(
        String(form.get("vowelPositions") || form.get("hiddenPositions") || "[]")
      ),
      consonantPositions: JSON.parse(String(form.get("consonantPositions") || "[]")),
      exerciseTypes: JSON.parse(String(form.get("exerciseTypes") || "[]"))
    });
    const text = spanishUpper(input.text);
    const image = form.get("image");
    const audio = form.get("audio");
    const storedImage = image instanceof File ? await storeMedia(image, "image") : null;
    const storedAudio = audio instanceof File ? await storeMedia(audio, "audio") : null;
    const configurations = buildWordConfigurations({ ...input, text });
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
      include: { category: true, configurations: true }
    });
    return NextResponse.json(word, { status: 201 });
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
