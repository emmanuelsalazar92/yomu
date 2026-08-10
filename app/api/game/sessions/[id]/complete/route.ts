import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateScore } from "@/lib/pedagogy";
import { ensureSessionTargetsForSession, finalizeSessionExercise } from "@/lib/session-targets";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await prisma.gameSession.findFirst({ where: { id, status: "ACTIVE" } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    await ensureSessionTargetsForSession(id);
    const pending = await prisma.sessionTarget.count({
      where: { sessionExercise: { sessionId: id }, outcome: null }
    });
    if (pending > 0) {
      return NextResponse.json(
        { error: "Todavía quedan respuestas pendientes en la sesión." },
        { status: 409 }
      );
    }
    const missingAttempts = await prisma.sessionExercise.findMany({
      where: { sessionId: id, attempt: null },
      select: { id: true }
    });
    for (const exercise of missingAttempts) await finalizeSessionExercise(exercise.id);
    const totals = await prisma.attempt.aggregate({
      where: { sessionId: id },
      _sum: {
        firstTryCorrectSpaces: true,
        totalSpaces: true,
        assistedSpaces: true,
        incorrectSpaces: true,
        skippedSpaces: true
      }
    });
    const score = calculateScore(
      totals._sum.firstTryCorrectSpaces || 0,
      totals._sum.totalSpaces || 0
    );
    await prisma.gameSession.update({
      where: { id },
      data: { status: "COMPLETED", score, completedAt: new Date() }
    });
    return NextResponse.json({
      score,
      correct: totals._sum.firstTryCorrectSpaces || 0,
      total: totals._sum.totalSpaces || 0,
      assisted: totals._sum.assistedSpaces || 0,
      incorrect: totals._sum.incorrectSpaces || 0,
      skipped: totals._sum.skippedSpaces || 0
    });
  } catch {
    return NextResponse.json({ error: "No se pudo finalizar" }, { status: 400 });
  }
}
