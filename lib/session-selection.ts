import type { ExerciseType, HelpMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adaptiveSelect, type ProgressState, type SelectionCandidate } from "@/lib/pedagogy";
import { DEFAULT_ACTIVE_CONSONANTS } from "@/lib/constants";
import { consonantBase, firstGraphemeIsVowel, graphemes } from "@/lib/spanish";

export type SessionOptions = {
  childProfileId: string;
  helpMode: HelpMode;
  exerciseType: ExerciseType;
  requestedCount: 10 | 20 | 30;
  categoryId?: string;
  difficulty?: number;
  includeLearned: boolean;
  requestKey?: string;
};

type EligibleConfiguration = Prisma.ExerciseConfigurationGetPayload<{
  include: { word: { include: { progress: true } } };
}>;

export type SessionCandidate = SelectionCandidate & {
  item: EligibleConfiguration;
  targetPosition: number | null;
  targetLetter: string | null;
  variantRank: number;
};

function stableRank(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export async function findEligibleCandidates(input: SessionOptions): Promise<SessionCandidate[]> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const activeConsonants = settings?.activeConsonants ?? [...DEFAULT_ACTIVE_CONSONANTS];
  const activeSet = new Set(activeConsonants);
  const configurations = await prisma.exerciseConfiguration.findMany({
    where: {
      active: true,
      type:
        input.exerciseType === "MIXED"
          ? { in: ["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL"] }
          : input.exerciseType,
      word: {
        active: true,
        deletedAt: null,
        categoryId: input.categoryId,
        difficulty: input.difficulty,
        imagePath: input.helpMode === "WITH_IMAGE" ? { not: null } : undefined
        // El modo escuchar admite MP3 personalizado o voz automática del navegador.
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
    const letters = graphemes(item.word.text);
    const eligibleConsonantPositions = item.hiddenPositions.filter((position) => {
      const consonant = consonantBase(letters[position] ?? "");
      return consonant !== null && activeSet.has(consonant);
    });
    if (item.type === "SINGLE_CONSONANT" && eligibleConsonantPositions.length === 0) continue;
    const targetPosition = item.type === "SINGLE_CONSONANT" ? eligibleConsonantPositions[0] : null;
    const targetLetter = targetPosition === null ? null : consonantBase(letters[targetPosition]);
    const progress = item.word.progress.find((value) => value.exerciseType === item.type);
    if (!input.includeLearned && progress?.state === "LEARNED") continue;
    const candidate: SessionCandidate = {
      id: item.wordId,
      state: (progress?.state || "NEW") as ProgressState,
      recentErrors: progress ? Math.max(0, progress.attempts - progress.firstTryCorrect) : 0,
      targetLetters: targetLetter ? [targetLetter] : [],
      item,
      targetPosition,
      targetLetter,
      variantRank: stableRank(`${input.requestKey ?? "availability"}:${item.id}`)
    };
    const existing = byWord.get(item.wordId);
    if (
      !existing ||
      candidate.recentErrors > existing.recentErrors ||
      (candidate.recentErrors === existing.recentErrors &&
        candidate.variantRank < existing.variantRank)
    )
      byWord.set(item.wordId, candidate);
  }
  return [...byWord.values()];
}

export async function getSessionAvailability(input: SessionOptions) {
  const candidates = await findEligibleCandidates(input);
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const activeConsonants = settings?.activeConsonants ?? [...DEFAULT_ACTIVE_CONSONANTS];
  return {
    requestedCount: input.requestedCount,
    availableCount: candidates.length,
    actualCount: Math.min(input.requestedCount, candidates.length),
    activeConsonants
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
