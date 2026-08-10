import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateMastery } from "@/lib/pedagogy";
import { answerMatches, graphemes } from "@/lib/spanish";
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
    const answers = input.answers.map((answer) => ({
      ...answer,
      expectedGrapheme: wordLetters[answer.position],
      correctFirstTry:
        answer.errorCount === 0 && answerMatches(wordLetters[answer.position], answer.selectedVowel)
    }));
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
    return NextResponse.json({ attemptId: attempt.id, state: evaluation.state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud inválida" },
      { status: 400 }
    );
  }
}
