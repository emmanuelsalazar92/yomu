import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistedSessionInclude, sessionResponse } from "@/lib/session-response";
import { selectSessionCandidates } from "@/lib/session-selection";
import { sessionSchema } from "@/lib/validation";
import { DEFAULT_ACTIVE_CONSONANTS, MIN_ACTIVE_CONSONANTS } from "@/lib/constants";
import { consonantChoices } from "@/lib/spanish";

function matchesRequest(
  session: {
    childProfileId: string;
    helpMode: string;
    exerciseType: string;
    requestedCount: number;
    includeLearned: boolean;
    categoryId: string | null;
    difficulty: number | null;
  },
  input: ReturnType<typeof sessionSchema.parse>
) {
  return (
    session.childProfileId === input.childProfileId &&
    session.helpMode === input.helpMode &&
    session.exerciseType === input.exerciseType &&
    session.requestedCount === input.requestedCount &&
    session.includeLearned === input.includeLearned &&
    session.categoryId === (input.categoryId ?? null) &&
    session.difficulty === (input.difficulty ?? null)
  );
}

function conflictResponse() {
  return NextResponse.json(
    {
      error: "IDEMPOTENCY_CONFLICT",
      message: "La clave de solicitud ya pertenece a otra configuración."
    },
    { status: 409 }
  );
}

export async function POST(request: Request) {
  try {
    const input = sessionSchema.parse(await request.json());
    const existing = await prisma.gameSession.findUnique({
      where: { requestKey: input.requestKey },
      include: persistedSessionInclude
    });
    if (existing) {
      if (!matchesRequest(existing, input)) return conflictResponse();
      return NextResponse.json(sessionResponse(existing));
    }

    const profile = await prisma.childProfile.findFirst({
      where: { id: input.childProfileId, active: true },
      select: { id: true }
    });
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    const selected = await selectSessionCandidates(input);
    if (selected.length === 0) {
      return NextResponse.json(
        {
          error: "NO_ELIGIBLE_WORDS",
          message:
            "No hay palabras que cumplan esta configuración. Cambia la ayuda, el reto o los filtros."
        },
        { status: 409 }
      );
    }

    try {
      const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
      const activeConsonants = settings?.activeConsonants ?? [...DEFAULT_ACTIVE_CONSONANTS];
      if (
        input.exerciseType === "SINGLE_CONSONANT" &&
        activeConsonants.length < MIN_ACTIVE_CONSONANTS
      ) {
        return NextResponse.json(
          { error: "Activa al menos tres consonantes en Ajustes." },
          { status: 409 }
        );
      }
      const session = await prisma.gameSession.create({
        data: {
          childProfileId: input.childProfileId,
          helpMode: input.helpMode,
          exerciseType: input.exerciseType,
          requestedCount: input.requestedCount,
          actualCount: selected.length,
          requestKey: input.requestKey,
          includeLearned: input.includeLearned,
          categoryId: input.categoryId,
          difficulty: input.difficulty,
          exercises: {
            create: selected.map((candidate, position) => ({
              wordId: candidate.item.wordId,
              configurationId: candidate.item.id,
              position,
              targetPosition: candidate.targetPosition,
              options:
                candidate.targetLetter && candidate.targetPosition !== null
                  ? consonantChoices(
                      candidate.targetLetter,
                      activeConsonants,
                      `${input.requestKey}:${candidate.item.wordId}:${candidate.targetPosition}`
                    )
                  : []
            }))
          }
        },
        include: persistedSessionInclude
      });
      return NextResponse.json(sessionResponse(session), { status: 201 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await prisma.gameSession.findUnique({
          where: { requestKey: input.requestKey },
          include: persistedSessionInclude
        });
        if (raced) {
          if (!matchesRequest(raced, input)) return conflictResponse();
          return NextResponse.json(sessionResponse(raced));
        }
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud inválida" },
      { status: 400 }
    );
  }
}
