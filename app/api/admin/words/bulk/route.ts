import type { ExerciseType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BULK_WORD_LIMIT, prepareBulkWord } from "@/lib/bulk-words";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";
import { normalizeForSearch, spanishUpper } from "@/lib/spanish";

const exerciseType = z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "SINGLE_CONSONANT"]);

const schema = z.object({
  words: z.array(z.string().min(1).max(100)).min(1).max(BULK_WORD_LIMIT),
  categoryId: z.uuid(),
  difficulty: z.coerce.number().int().min(1).max(5),
  exerciseTypes: z.array(exerciseType).min(1)
});

type BulkIssue = { text: string; reason: string };

export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const input = schema.parse(await request.json());
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) return NextResponse.json({ error: "La categoría no existe" }, { status: 400 });

    const unique = new Map<string, string>();
    const skipped: BulkIssue[] = [];
    for (const rawText of input.words) {
      const text = spanishUpper(rawText.trim().replace(/\s+/g, " "));
      const key = normalizeForSearch(text);
      if (unique.has(key)) {
        skipped.push({ text, reason: "Repetida en esta carga" });
      } else {
        unique.set(key, text);
      }
    }

    const existing = await prisma.word.findMany({
      where: { categoryId: input.categoryId, normalizedText: { in: [...unique.keys()] } },
      select: { normalizedText: true }
    });
    const existingKeys = new Set(existing.map((word) => word.normalizedText));
    const created = [];
    const rejected: BulkIssue[] = [];

    for (const [normalizedText, rawText] of unique) {
      if (existingKeys.has(normalizedText)) {
        skipped.push({ text: rawText, reason: "Ya existe en esta categoría" });
        continue;
      }
      try {
        const prepared = prepareBulkWord(rawText, input.exerciseTypes as ExerciseType[]);
        const word = await prisma.word.create({
          data: {
            text: prepared.text,
            normalizedText,
            categoryId: input.categoryId,
            difficulty: input.difficulty,
            configurations: { create: prepared.configurations }
          },
          include: { category: true, configurations: { where: { active: true } } }
        });
        created.push(word);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "No se pudo crear";
        if (/unique constraint/i.test(reason)) {
          skipped.push({ text: rawText, reason: "Ya existe en esta categoría" });
        } else {
          rejected.push({ text: rawText, reason });
        }
      }
    }

    return NextResponse.json(
      { created, skipped, rejected },
      { status: created.length ? 201 : 200 }
    );
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
