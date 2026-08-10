import type { ExerciseType, HelpMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adaptiveSelect, type ProgressState, type SelectionCandidate } from "@/lib/pedagogy";
import { firstGraphemeIsVowel } from "@/lib/spanish";

export type SessionOptions = {
  childProfileId: string;
  helpMode: HelpMode;
  exerciseType: ExerciseType;
  requestedCount: 10 | 20 | 30;
  categoryId?: string;
  difficulty?: number;
  includeLearned: boolean;
};

type EligibleConfiguration = Prisma.ExerciseConfigurationGetPayload<{
  include: { word: { include: { progress: true } } };
}>;

export type SessionCandidate = SelectionCandidate & { item: EligibleConfiguration };

export async function findEligibleCandidates(input: SessionOptions): Promise<SessionCandidate[]> {
  const configurations = await prisma.exerciseConfiguration.findMany({
    where: {
      active: true,
      type: input.exerciseType === "MIXED" ? undefined : input.exerciseType,
      word: {
        active: true,
        deletedAt: null,
        categoryId: input.categoryId,
        difficulty: input.difficulty,
        imagePath: input.helpMode === "WITH_IMAGE" ? { not: null } : undefined,
        audioPath: input.helpMode === "LISTEN" ? { not: null } : undefined
      }
    },
    include: {
      word: {
        include: {
          progress: {
            where: { childProfileId: input.childProfileId, helpMode: input.helpMode }
          }
        }
      }
    },
    orderBy: [{ word: { createdAt: "asc" } }, { createdAt: "asc" }]
  });

  const byWord = new Map<string, SessionCandidate>();
  for (const item of configurations) {
    if (item.type === "INITIAL_VOWEL" && !firstGraphemeIsVowel(item.word.text)) continue;
    const progress = item.word.progress.find((value) => value.exerciseType === item.type);
    if (!input.includeLearned && progress?.state === "LEARNED") continue;
    const candidate: SessionCandidate = {
      id: item.wordId,
      state: (progress?.state || "NEW") as ProgressState,
      recentErrors: progress ? Math.max(0, progress.attempts - progress.firstTryCorrect) : 0,
      vowelFamilies: [],
      item
    };
    const existing = byWord.get(item.wordId);
    if (!existing || candidate.recentErrors > existing.recentErrors)
      byWord.set(item.wordId, candidate);
  }
  return [...byWord.values()];
}

export async function getSessionAvailability(input: SessionOptions) {
  const candidates = await findEligibleCandidates(input);
  return {
    requestedCount: input.requestedCount,
    availableCount: candidates.length,
    actualCount: Math.min(input.requestedCount, candidates.length)
  };
}

export async function selectSessionCandidates(input: SessionOptions) {
  const candidates = await findEligibleCandidates(input);
  return adaptiveSelect(
    candidates,
    input.requestedCount,
    input.includeLearned
  ) as SessionCandidate[];
}
