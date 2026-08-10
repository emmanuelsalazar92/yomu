import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateMastery } from "@/lib/pedagogy";
import { consonantBase, graphemes, targetMatches } from "@/lib/spanish";
import { attemptSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = attemptSchema.parse(await request.json());
    const [session, sessionExercise] = await Promise.all([
      prisma.gameSession.findFirst({ where: { id, status: "ACTIVE" } }),
      prisma.sessionExercise.findFirst({
        where: { sessionId: id, configurationId: input.configurationId },
        include: { configuration: { include: { word: true } } }
      })
    ]);
    let configuration = sessionExercise?.configuration;
    // Las sesiones previas a la migración no almacenaban sus elementos. Se mantiene
    // esta ruta limitada a registros legacy; las sesiones nuevas exigen pertenencia persistida.
    if (!configuration && session?.requestKey === null) {
      const legacyConfiguration = await prisma.exerciseConfiguration.findUnique({
        where: { id: input.configurationId },
        include: { word: true }
      });
      configuration = legacyConfiguration ?? undefined;
    }
    if (!session || !configuration)
      return NextResponse.json({ error: "Sesión o ejercicio no encontrado" }, { status: 404 });
    const wordLetters = graphemes(configuration.word.text);
    const positions = new Set(configuration.hiddenPositions);
    if (input.answers.some((answer) => !positions.has(answer.position)))
      throw new Error("Respuesta fuera de la configuración");
    const targetKind = configuration.type === "SINGLE_CONSONANT" ? "CONSONANT" : "VOWEL";
    if (
      targetKind === "CONSONANT" &&
      (!sessionExercise ||
        input.answers.length !== 1 ||
        input.answers[0].position !== sessionExercise.targetPosition ||
        !sessionExercise.options.includes(input.answers[0].selectedLetter))
    ) {
      throw new Error("Respuesta fuera de las opciones de la sesión");
    }
    const answers = input.answers.map((answer) => {
      const expectedGrapheme = wordLetters[answer.position];
      return {
        position: answer.position,
        selectedLetter: answer.selectedLetter,
        expectedGrapheme,
        correctFirstTry:
          answer.errorCount === 0 &&
          targetMatches(expectedGrapheme, answer.selectedLetter, targetKind),
        errorCount: answer.errorCount
      };
    });
    const targetPosition = targetKind === "CONSONANT" ? answers[0].position : null;
    const targetLetter =
      targetPosition === null ? null : consonantBase(wordLetters[targetPosition]);
    const attempt = await prisma.attempt.create({
      data: {
        sessionId: id,
        childProfileId: session.childProfileId,
        wordId: configuration.wordId,
        configurationId: configuration.id,
        exerciseType: configuration.type,
        helpMode: session.helpMode,
        firstTryCorrectSpaces: answers.filter((answer) => answer.correctFirstTry).length,
        totalSpaces: answers.length,
        errorCount: answers.reduce((sum, answer) => sum + answer.errorCount, 0),
        audioPlayCount: input.audioPlayCount,
        responseTimeMs: input.responseTimeMs,
        targetKind,
        targetLetter,
        targetPosition,
        options: sessionExercise?.options ?? [],
        answers: { create: answers }
      }
    });
    const history = await prisma.attempt.findMany({
      where: {
        childProfileId: session.childProfileId,
        wordId: configuration.wordId,
        exerciseType: configuration.type,
        helpMode: session.helpMode
      },
      orderBy: { createdAt: "asc" },
      include: { answers: true }
    });
    const evaluation = evaluateMastery(
      history.map((item) => ({
        firstTryCorrect: item.answers.every((answer) => answer.correctFirstTry),
        sessionId: item.sessionId,
        mode: item.helpMode
      }))
    );
    await prisma.wordSkillProgress.upsert({
      where: {
        childProfileId_wordId_exerciseType_helpMode: {
          childProfileId: session.childProfileId,
          wordId: configuration.wordId,
          exerciseType: configuration.type,
          helpMode: session.helpMode
        }
      },
      create: {
        childProfileId: session.childProfileId,
        wordId: configuration.wordId,
        exerciseType: configuration.type,
        helpMode: session.helpMode,
        state: evaluation.state,
        attempts: history.length,
        firstTryCorrect: history.filter((item) =>
          item.answers.every((answer) => answer.correctFirstTry)
        ).length,
        recentAccuracy: evaluation.accuracy,
        distinctSessions: new Set(history.map((item) => item.sessionId)).size,
        lastPracticedAt: new Date()
      },
      update: {
        state: evaluation.state,
        attempts: history.length,
        firstTryCorrect: history.filter((item) =>
          item.answers.every((answer) => answer.correctFirstTry)
        ).length,
        recentAccuracy: evaluation.accuracy,
        distinctSessions: new Set(history.map((item) => item.sessionId)).size,
        lastPracticedAt: new Date()
      }
    });
    if (targetKind === "CONSONANT" && targetLetter) {
      const firstTryCorrect = answers[0].correctFirstTry ? 1 : 0;
      const errorCount = answers[0].errorCount;
      await prisma.letterSkillProgress.upsert({
        where: {
          childProfileId_targetKind_targetLetter_exerciseType: {
            childProfileId: session.childProfileId,
            targetKind,
            targetLetter,
            exerciseType: configuration.type
          }
        },
        create: {
          childProfileId: session.childProfileId,
          targetKind,
          targetLetter,
          exerciseType: configuration.type,
          attempts: 1,
          firstTryCorrect,
          errorCount,
          lastPracticedAt: new Date()
        },
        update: {
          attempts: { increment: 1 },
          firstTryCorrect: { increment: firstTryCorrect },
          errorCount: { increment: errorCount },
          lastPracticedAt: new Date()
        }
      });
    }
    return NextResponse.json({ attemptId: attempt.id, state: evaluation.state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud inválida" },
      { status: 400 }
    );
  }
}
