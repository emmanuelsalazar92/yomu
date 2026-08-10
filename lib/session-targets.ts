import { Prisma, type AnswerOutcome, type TargetKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateMastery } from "@/lib/pedagogy";
import { evaluateAnswerOutcome } from "@/lib/answer-outcomes";
import { graphemes, vowelBase } from "@/lib/spanish";

export type TargetAction =
  | { kind: "ANSWER"; selectedLetter: string; responseTimeMs: number; audioPlayCount: number }
  | { kind: "HELP"; reveal: boolean; responseTimeMs: number; audioPlayCount: number }
  | { kind: "SKIP"; responseTimeMs: number; audioPlayCount: number };

export async function ensureSessionTargetsForSession(sessionId: string) {
  const exercises = await prisma.sessionExercise.findMany({
    where: { sessionId },
    include: { configuration: true, word: true, targets: true }
  });
  for (const exercise of exercises) {
    const letters = graphemes(exercise.word.text);
    const positions =
      exercise.configuration.type === "SINGLE_CONSONANT" && exercise.targetPosition !== null
        ? [exercise.targetPosition]
        : exercise.configuration.hiddenPositions;
    await prisma.sessionTarget.createMany({
      data: positions.map((targetPosition) => ({
        sessionExerciseId: exercise.id,
        targetPosition,
        expectedGrapheme: letters[targetPosition] ?? ""
      })),
      skipDuplicates: true
    });
    const stale = exercise.targets.filter((target) => !target.expectedGrapheme);
    await Promise.all(
      stale.map((target) =>
        prisma.sessionTarget.update({
          where: { id: target.id },
          data: { expectedGrapheme: letters[target.targetPosition] ?? "" }
        })
      )
    );
  }
}

function targetKindFor(type: string): TargetKind {
  return type === "SINGLE_CONSONANT" ? "CONSONANT" : "VOWEL";
}

async function updateProgressAfterAttempt(
  tx: Prisma.TransactionClient,
  sessionExerciseId: string
) {
  const item = await tx.sessionExercise.findUniqueOrThrow({
    where: { id: sessionExerciseId },
    include: {
      session: true,
      configuration: true,
      word: true,
      targets: { orderBy: { targetPosition: "asc" } }
    }
  });
  if (item.targets.some((target) => target.outcome === null)) return null;
  const outcomes = item.targets.map((target) => target.outcome!);
  const targetKind = targetKindFor(item.configuration.type);
  const target = targetKind === "CONSONANT" ? item.targets[0] : null;
  const attempt = await tx.attempt.create({
    data: {
      sessionId: item.sessionId,
      sessionExerciseId: item.id,
      childProfileId: item.session.childProfileId,
      wordId: item.wordId,
      configurationId: item.configurationId,
      exerciseType: item.configuration.type,
      helpMode: item.session.helpMode,
      firstTryCorrectSpaces: outcomes.filter((value) => value === "CORRECT").length,
      totalSpaces: outcomes.length,
      errorCount: outcomes.filter((value) => value === "INCORRECT").length,
      assistedSpaces: outcomes.filter((value) => value === "ASSISTED").length,
      incorrectSpaces: outcomes.filter((value) => value === "INCORRECT").length,
      skippedSpaces: outcomes.filter((value) => value === "SKIPPED").length,
      audioPlayCount: item.targets.reduce((sum, value) => sum + value.audioPlayCount, 0),
      responseTimeMs: Math.max(...item.targets.map((value) => value.responseTimeMs ?? 0)),
      targetKind,
      targetLetter: target?.expectedGrapheme ?? null,
      targetPosition: target?.targetPosition ?? null,
      options: item.options,
      answers: {
        create: item.targets.map((value) => ({
          position: value.targetPosition,
          selectedLetter: value.selectedLetter,
          expectedGrapheme: value.expectedGrapheme,
          correctFirstTry: value.outcome === "CORRECT",
          errorCount: value.outcome === "INCORRECT" ? 1 : 0,
          outcome: value.outcome!,
          helpUsed: value.helpUsed
        }))
      }
    }
  });

  const history = await tx.attempt.findMany({
    where: {
      childProfileId: item.session.childProfileId,
      wordId: item.wordId,
      exerciseType: item.configuration.type,
      helpMode: item.session.helpMode
    },
    orderBy: { createdAt: "asc" },
    include: { answers: true }
  });
  const evaluation = evaluateMastery(
    history.map((value) => ({
      firstTryCorrect: value.answers.every((answer) => answer.outcome === "CORRECT"),
      sessionId: value.sessionId,
      mode: value.helpMode
    }))
  );
  const firstTryCorrect = history.filter((value) =>
    value.answers.every((answer) => answer.outcome === "CORRECT")
  ).length;
  await tx.wordSkillProgress.upsert({
    where: {
      childProfileId_wordId_exerciseType_helpMode: {
        childProfileId: item.session.childProfileId,
        wordId: item.wordId,
        exerciseType: item.configuration.type,
        helpMode: item.session.helpMode
      }
    },
    create: {
      childProfileId: item.session.childProfileId,
      wordId: item.wordId,
      exerciseType: item.configuration.type,
      helpMode: item.session.helpMode,
      state: evaluation.state,
      attempts: history.length,
      firstTryCorrect,
      recentAccuracy: evaluation.accuracy,
      distinctSessions: new Set(history.map((value) => value.sessionId)).size,
      lastPracticedAt: new Date()
    },
    update: {
      state: evaluation.state,
      attempts: history.length,
      firstTryCorrect,
      recentAccuracy: evaluation.accuracy,
      distinctSessions: new Set(history.map((value) => value.sessionId)).size,
      lastPracticedAt: new Date()
    }
  });
  if (targetKind === "CONSONANT" && target) {
    await tx.letterSkillProgress.upsert({
      where: {
        childProfileId_targetKind_targetLetter_exerciseType: {
          childProfileId: item.session.childProfileId,
          targetKind,
          targetLetter: target.expectedGrapheme,
          exerciseType: item.configuration.type
        }
      },
      create: {
        childProfileId: item.session.childProfileId,
        targetKind,
        targetLetter: target.expectedGrapheme,
        exerciseType: item.configuration.type,
        attempts: 1,
        firstTryCorrect: target.outcome === "CORRECT" ? 1 : 0,
        errorCount: target.outcome === "CORRECT" ? 0 : 1,
        lastPracticedAt: new Date()
      },
      update: {
        attempts: { increment: 1 },
        firstTryCorrect: { increment: target.outcome === "CORRECT" ? 1 : 0 },
        errorCount: { increment: target.outcome === "CORRECT" ? 0 : 1 },
        lastPracticedAt: new Date()
      }
    });
  }
  return attempt;
}

export async function finalizeSessionExercise(sessionExerciseId: string) {
  for (let retry = 0; retry < 3; retry += 1) {
    try {
      return await prisma.$transaction(
        (tx) => updateProgressAfterAttempt(tx, sessionExerciseId),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return prisma.attempt.findUnique({ where: { sessionExerciseId } });
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        retry < 2
      )
        continue;
      throw error;
    }
  }
  return null;
}

export async function recordTargetAction(input: {
  sessionId: string;
  sessionExerciseId: string;
  position: number;
  action: TargetAction;
}) {
  await ensureSessionTargetsForSession(input.sessionId);
  for (let retry = 0; retry < 4; retry += 1) {
    const target = await prisma.sessionTarget.findUnique({
      where: {
        sessionExerciseId_targetPosition: {
          sessionExerciseId: input.sessionExerciseId,
          targetPosition: input.position
        }
      },
      include: {
        sessionExercise: { include: { session: true, configuration: true } }
      }
    });
    if (!target || target.sessionExercise.sessionId !== input.sessionId)
      throw new Error("Objetivo no encontrado");
    if (target.outcome !== null) {
      const attempt = await prisma.attempt.findUnique({
        where: { sessionExerciseId: input.sessionExerciseId }
      });
      return { target, attempt, alreadyRecorded: true };
    }
    if (target.sessionExercise.session.status !== "ACTIVE")
      throw new Error("La sesión ya no está activa");

    if (input.action.kind === "HELP" && !input.action.reveal) {
      const updated = await prisma.sessionTarget.updateMany({
        where: { id: target.id, outcome: null },
        data: {
          helpUsed: true,
          audioPlayCount: { increment: input.action.audioPlayCount },
          responseTimeMs: input.action.responseTimeMs
        }
      });
      if (updated.count === 0) continue;
      return {
        target: await prisma.sessionTarget.findUniqueOrThrow({ where: { id: target.id } }),
        attempt: null,
        alreadyRecorded: false
      };
    }

    const targetKind = targetKindFor(target.sessionExercise.configuration.type);
    let outcome: AnswerOutcome;
    let selectedLetter: string | null = null;
    let helpUsed = target.helpUsed;
    if (input.action.kind === "SKIP") {
      outcome = "SKIPPED";
    } else if (input.action.kind === "HELP") {
      outcome = "ASSISTED";
      helpUsed = true;
    } else {
      selectedLetter = input.action.selectedLetter;
      if (targetKind === "VOWEL" && !vowelBase(selectedLetter))
        throw new Error("Opción de vocal inválida");
      if (
        targetKind === "CONSONANT" &&
        !target.sessionExercise.options.includes(selectedLetter)
      )
        throw new Error("Opción de consonante inválida");
      outcome = evaluateAnswerOutcome({
        expected: target.expectedGrapheme,
        selected: selectedLetter,
        targetKind,
        helpUsed
      });
    }

    const updated = await prisma.sessionTarget.updateMany({
      where: { id: target.id, outcome: null, helpUsed: target.helpUsed },
      data: {
        selectedLetter,
        outcome,
        helpUsed,
        responseTimeMs: input.action.responseTimeMs,
        audioPlayCount: input.action.audioPlayCount,
        answeredAt: new Date()
      }
    });
    if (updated.count === 0) continue;
    const persisted = await prisma.sessionTarget.findUniqueOrThrow({ where: { id: target.id } });
    const attempt = await finalizeSessionExercise(input.sessionExerciseId);
    return { target: persisted, attempt, alreadyRecorded: false };
  }
  throw new Error("No se pudo registrar la primera respuesta");
}

export function publicTarget(target: {
  id: string;
  targetPosition: number;
  selectedLetter: string | null;
  expectedGrapheme: string;
  outcome: AnswerOutcome | null;
  helpUsed: boolean;
  answeredAt: Date | null;
}) {
  return {
    id: target.id,
    position: target.targetPosition,
    selectedLetter: target.selectedLetter,
    expectedLetter: target.outcome ? target.expectedGrapheme : null,
    outcome: target.outcome,
    helpUsed: target.helpUsed,
    answeredAt: target.answeredAt
  };
}
