import type { Prisma } from "@prisma/client";
import { publicTarget } from "@/lib/session-targets";

export const persistedSessionInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: {
      word: true,
      configuration: true,
      targets: { orderBy: { targetPosition: "asc" as const } }
    }
  }
} satisfies Prisma.GameSessionInclude;

type PersistedSession = Prisma.GameSessionGetPayload<{ include: typeof persistedSessionInclude }>;

export function sessionResponse(
  session: PersistedSession,
  settings?: { feedbackDelayMs: number; incorrectFeedbackDelayMs: number } | null
) {
  return {
    sessionId: session.id,
    childProfileId: session.childProfileId,
    exerciseType: session.exerciseType,
    helpMode: session.helpMode,
    requestedCount: session.requestedCount,
    actualCount: session.actualCount,
    feedbackDelayMs: settings?.feedbackDelayMs ?? 900,
    incorrectFeedbackDelayMs: settings?.incorrectFeedbackDelayMs ?? 2200,
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
      audioUrl: exercise.word.audioPath ? `/api/media/${exercise.word.audioPath}` : null,
      targets: exercise.targets.map(publicTarget)
    }))
  };
}
