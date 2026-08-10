import { Prisma, type AnswerOutcome, type DailyActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildAdultRecommendation,
  DAILY_REWARDS,
  initialSound,
  isEarlySyllableWord,
  stableChoices,
  syllabifySpanish
} from "@/lib/early-reading";
import { spanishUpper } from "@/lib/spanish";

export const dailyJourneyInclude = {
  childProfile: { select: { id: true, nickname: true, avatar: true } },
  activities: {
    orderBy: { position: "asc" as const },
    include: {
      word: true,
      targets: { orderBy: { targetPosition: "asc" as const } }
    }
  }
} satisfies Prisma.DailyJourneyInclude;

export type PersistedDailyJourney = Prisma.DailyJourneyGetPayload<{
  include: typeof dailyJourneyInclude;
}>;

export function costaRicaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function publicDailyTarget(
  type: DailyActivityType,
  target: PersistedDailyJourney["activities"][number]["targets"][number]
) {
  return {
    id: target.id,
    position: target.targetPosition,
    expectedPiece:
      type === "TRACE_LETTER" || target.outcome !== null ? target.expectedPiece : null,
    selectedPiece: target.selectedPiece,
    outcome: target.outcome,
    helpUsed: target.helpUsed,
    answeredAt: target.answeredAt
  };
}

export function dailySummary(journey: PersistedDailyJourney) {
  const targets = journey.activities.flatMap((activity) =>
    activity.targets.map((target) => ({
      type: activity.type,
      expectedPiece: target.expectedPiece,
      outcome: target.outcome
    }))
  );
  const resolved = targets.filter((target) => target.outcome !== null);
  return {
    correct: resolved.filter((target) => target.outcome === "CORRECT").length,
    incorrect: resolved.filter((target) => target.outcome === "INCORRECT").length,
    assisted: resolved.filter((target) => target.outcome === "ASSISTED").length,
    skipped: resolved.filter((target) => target.outcome === "SKIPPED").length,
    total: targets.length,
    strengths: [
      ...new Set(
        resolved
          .filter((target) => target.outcome === "CORRECT")
          .map((target) => target.expectedPiece)
      )
    ].slice(0, 6),
    practice: [
      ...new Set(
        resolved
          .filter((target) => target.outcome !== "CORRECT")
          .map((target) => target.expectedPiece)
      )
    ].slice(0, 6),
    recommendation: buildAdultRecommendation(targets)
  };
}

export function dailyJourneyResponse(journey: PersistedDailyJourney) {
  const reward =
    journey.rewardStage && journey.rewardStage > 0
      ? DAILY_REWARDS[Math.min(journey.rewardStage, DAILY_REWARDS.length) - 1]
      : null;
  return {
    journeyId: journey.id,
    dateKey: journey.dateKey,
    status: journey.status,
    child: journey.childProfile,
    reward: reward ? { ...reward, stage: journey.rewardStage } : null,
    activities: journey.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      position: activity.position,
      wordText: activity.wordText,
      imageUrl: activity.word?.imagePath ? `/api/media/${activity.word.imagePath}` : null,
      audioUrl: activity.word?.audioPath ? `/api/media/${activity.word.audioPath}` : null,
      options: activity.options,
      outcome: activity.outcome,
      targets: activity.targets.map((target) => publicDailyTarget(activity.type, target))
    })),
    summary: dailySummary(journey)
  };
}

type WordCandidate = {
  id: string;
  text: string;
  imagePath: string | null;
  audioPath: string | null;
};

function orderedWords(words: WordCandidate[], seed: string) {
  const ids = stableChoices(
    words.map((word) => word.id),
    seed
  );
  const byId = new Map(words.map((word) => [word.id, word]));
  return ids.map((id) => byId.get(id)!).filter(Boolean);
}

export async function createOrGetDailyJourney(childProfileId: string) {
  const dateKey = costaRicaDateKey();
  const existing = await prisma.dailyJourney.findUnique({
    where: { childProfileId_dateKey: { childProfileId, dateKey } },
    include: dailyJourneyInclude
  });
  if (existing) return existing;
  const [profile, words, difficultLetter] = await Promise.all([
    prisma.childProfile.findFirst({ where: { id: childProfileId, active: true } }),
    prisma.word.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true, text: true, imagePath: true, audioPath: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.letterSkillProgress.findFirst({
      where: { childProfileId },
      orderBy: [{ errorCount: "desc" }, { updatedAt: "desc" }]
    })
  ]);
  if (!profile) throw new Error("Perfil no encontrado");
  if (words.length < 2) throw new Error("Se necesitan al menos dos palabras activas para la ruta diaria.");

  const ordered = orderedWords(words, `${childProfileId}:${dateKey}`);
  const distinctInitials: WordCandidate[] = [];
  const usedInitials = new Set<string>();
  for (const word of ordered) {
    const sound = initialSound(word.text);
    if (!sound || usedInitials.has(sound)) continue;
    usedInitials.add(sound);
    distinctInitials.push(word);
  }
  const initialWords = distinctInitials.slice(0, 2);
  while (initialWords.length < 2) initialWords.push(ordered[initialWords.length % ordered.length]);
  const syllableWords = ordered.filter((word) => isEarlySyllableWord(word.text)).slice(0, 2);
  while (syllableWords.length < 2)
    syllableWords.push(ordered[(initialWords.length + syllableWords.length) % ordered.length]);
  const soundPool = [
    ...new Set([
      ...words.map((word) => initialSound(word.text)).filter(Boolean),
      "M",
      "P",
      "L",
      "S",
      "A",
      "E"
    ])
  ];
  const syllablePool = [...new Set(words.flatMap((word) => syllabifySpanish(word.text)))];
  const fallbackLetter = initialSound(initialWords[0].text) || "M";
  const traceLetter = difficultLetter?.targetLetter ?? fallbackLetter;

  const activities = [
    ...initialWords.map((word, position) => {
      const expected = initialSound(word.text);
      const distractors = stableChoices(
        soundPool.filter((sound) => sound !== expected),
        `${dateKey}:initial:${word.id}`,
        2
      );
      return {
        type: "INITIAL_SOUND" as const,
        position,
        wordId: word.id,
        wordText: word.text,
        options: stableChoices([expected, ...distractors], `${dateKey}:initial-order:${word.id}`),
        targets: { create: [{ targetPosition: 0, expectedPiece: expected }] }
      };
    }),
    ...syllableWords.map((word, offset) => {
      const expected = syllabifySpanish(word.text);
      const distractors = stableChoices(
        syllablePool.filter((syllable) => !expected.includes(syllable)),
        `${dateKey}:syllable:${word.id}`,
        2
      );
      return {
        type: "SYLLABLE_BUILD" as const,
        position: offset + 2,
        wordId: word.id,
        wordText: word.text,
        options: stableChoices([...expected, ...distractors], `${dateKey}:syllable-order:${word.id}`),
        targets: {
          create: expected.map((piece, targetPosition) => ({ targetPosition, expectedPiece: piece }))
        }
      };
    }),
    {
      type: "TRACE_LETTER" as const,
      position: 4,
      wordId: null,
      wordText: null,
      options: [],
      targets: { create: [{ targetPosition: 0, expectedPiece: traceLetter }] }
    }
  ];

  try {
    return await prisma.dailyJourney.create({
      data: {
        childProfileId,
        dateKey,
        activities: { create: activities }
      },
      include: dailyJourneyInclude
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.dailyJourney.findUniqueOrThrow({
        where: { childProfileId_dateKey: { childProfileId, dateKey } },
        include: dailyJourneyInclude
      });
    }
    throw error;
  }
}

function activityOutcome(outcomes: AnswerOutcome[]) {
  if (outcomes.includes("INCORRECT")) return "INCORRECT" as const;
  if (outcomes.includes("ASSISTED")) return "ASSISTED" as const;
  if (outcomes.includes("SKIPPED")) return "SKIPPED" as const;
  return "CORRECT" as const;
}

export async function recordDailyAnswer(input: {
  journeyId: string;
  activityId: string;
  position: number;
  action: "ANSWER" | "HELP" | "SKIP" | "TRACE";
  selectedPiece?: string;
  tracePoints?: number;
  responseTimeMs: number;
}) {
  for (let retry = 0; retry < 4; retry += 1) {
    const target = await prisma.dailyActivityTarget.findUnique({
      where: {
        activityId_targetPosition: {
          activityId: input.activityId,
          targetPosition: input.position
        }
      },
      include: { activity: { include: { journey: true } } }
    });
    if (!target || target.activity.journeyId !== input.journeyId)
      throw new Error("Actividad no encontrada");
    if (target.outcome !== null) return { target, alreadyRecorded: true };
    if (target.activity.journey.status !== "ACTIVE") throw new Error("La ruta ya terminó");

    let outcome: AnswerOutcome;
    let selectedPiece: string | null = null;
    let helpUsed = false;
    if (input.action === "HELP") {
      outcome = "ASSISTED";
      helpUsed = true;
    } else if (input.action === "SKIP") {
      outcome = "SKIPPED";
    } else if (input.action === "TRACE") {
      if (target.activity.type !== "TRACE_LETTER" || (input.tracePoints ?? 0) < 12)
        throw new Error("Repasa un poco más la letra antes de terminar.");
      outcome = "CORRECT";
      selectedPiece = "TRAZO";
    } else {
      selectedPiece = spanishUpper(input.selectedPiece ?? "");
      if (!target.activity.options.includes(selectedPiece)) throw new Error("Opción inválida");
      outcome = selectedPiece === spanishUpper(target.expectedPiece) ? "CORRECT" : "INCORRECT";
    }
    const updated = await prisma.dailyActivityTarget.updateMany({
      where: { id: target.id, outcome: null },
      data: {
        selectedPiece,
        outcome,
        helpUsed,
        responseTimeMs: input.responseTimeMs,
        answeredAt: new Date()
      }
    });
    if (!updated.count) continue;
    const persisted = await prisma.dailyActivityTarget.findUniqueOrThrow({ where: { id: target.id } });
    const targets = await prisma.dailyActivityTarget.findMany({
      where: { activityId: input.activityId },
      orderBy: { targetPosition: "asc" }
    });
    if (targets.every((item) => item.outcome !== null)) {
      await prisma.dailyActivity.update({
        where: { id: input.activityId },
        data: { outcome: activityOutcome(targets.map((item) => item.outcome!)) }
      });
    }
    return { target: persisted, alreadyRecorded: false };
  }
  throw new Error("No se pudo guardar la primera respuesta");
}

export async function completeDailyJourney(journeyId: string) {
  const journey = await prisma.dailyJourney.findUnique({
    where: { id: journeyId },
    include: dailyJourneyInclude
  });
  if (!journey) throw new Error("Ruta no encontrada");
  if (journey.status === "COMPLETED") return journey;
  if (journey.activities.some((activity) => activity.targets.some((target) => !target.outcome)))
    throw new Error("Todavía quedan actividades pendientes");
  const completedCount = await prisma.dailyJourney.count({
    where: { childProfileId: journey.childProfileId, status: "COMPLETED" }
  });
  const rewardStage = Math.min(completedCount + 1, DAILY_REWARDS.length);
  return prisma.dailyJourney.update({
    where: { id: journey.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      rewardStage,
      rewardName: DAILY_REWARDS[rewardStage - 1].name
    },
    include: dailyJourneyInclude
  });
}
