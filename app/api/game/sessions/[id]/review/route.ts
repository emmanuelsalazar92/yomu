import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistedSessionInclude, sessionResponse } from "@/lib/session-response";
import { ensureSessionTargetsForSession } from "@/lib/session-targets";
import { reviewSessionSchema } from "@/lib/validation";
import { graphemes } from "@/lib/spanish";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = reviewSessionSchema.parse(await request.json());
    const existing = await prisma.gameSession.findUnique({
      where: { requestKey: input.requestKey },
      include: persistedSessionInclude
    });
    if (existing) {
      if (existing.reviewOfSessionId !== id)
        return NextResponse.json({ error: "IDEMPOTENCY_CONFLICT" }, { status: 409 });
      const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
      return NextResponse.json(sessionResponse(existing, settings));
    }

    await ensureSessionTargetsForSession(id);
    const original = await prisma.gameSession.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { position: "asc" },
          include: { word: true, configuration: true, targets: true }
        }
      }
    });
    if (!original || original.status !== "COMPLETED")
      return NextResponse.json({ error: "La sesión original no está terminada." }, { status: 409 });

    const eligible = original.exercises.filter(
      (exercise) =>
        exercise.word.active &&
        exercise.word.deletedAt === null &&
        exercise.configuration.active &&
        exercise.targets.some((target) => target.outcome !== "CORRECT")
    );
    if (eligible.length === 0)
      return NextResponse.json({ error: "No hay palabras pendientes para repasar." }, { status: 409 });

    const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    try {
      const review = await prisma.gameSession.create({
        data: {
          childProfileId: original.childProfileId,
          helpMode: original.helpMode,
          exerciseType: original.exerciseType,
          requestedCount: eligible.length,
          actualCount: eligible.length,
          requestKey: input.requestKey,
          includeLearned: original.includeLearned,
          categoryId: original.categoryId,
          difficulty: original.difficulty,
          reviewOfSessionId: original.id,
          exercises: {
            create: eligible.map((exercise, position) => {
              const letters = graphemes(exercise.word.text);
              const positions = exercise.targets.map((target) => target.targetPosition);
              return {
                wordId: exercise.wordId,
                configurationId: exercise.configurationId,
                position,
                targetPosition: exercise.targetPosition,
                options: exercise.options,
                targets: {
                  create: positions.map((targetPosition) => ({
                    targetPosition,
                    expectedGrapheme: letters[targetPosition] ?? ""
                  }))
                }
              };
            })
          }
        },
        include: persistedSessionInclude
      });
      return NextResponse.json(sessionResponse(review, settings), { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await prisma.gameSession.findUnique({
          where: { requestKey: input.requestKey },
          include: persistedSessionInclude
        });
        if (raced?.reviewOfSessionId === id)
          return NextResponse.json(sessionResponse(raced, settings));
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear el repaso" },
      { status: 400 }
    );
  }
}
