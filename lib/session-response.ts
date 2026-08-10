import type { Prisma } from "@prisma/client";

export const persistedSessionInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: { word: true, configuration: true }
  }
} satisfies Prisma.GameSessionInclude;

type PersistedSession = Prisma.GameSessionGetPayload<{ include: typeof persistedSessionInclude }>;

export function sessionResponse(session: PersistedSession) {
  return {
    sessionId: session.id,
    requestedCount: session.requestedCount,
    actualCount: session.actualCount,
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      wordId: exercise.wordId,
      configurationId: exercise.configurationId,
      text: exercise.word.text,
      hiddenPositions: exercise.configuration.hiddenPositions,
      type: exercise.configuration.type,
      targetKind: exercise.configuration.type === "SINGLE_CONSONANT" ? "CONSONANT" : "VOWEL",
      targetPosition: exercise.targetPosition,
      options: exercise.options,
      imageUrl: exercise.word.imagePath ? `/api/media/${exercise.word.imagePath}` : null,
      audioUrl: exercise.word.audioPath ? `/api/media/${exercise.word.audioPath}` : null
    }))
  };
}
