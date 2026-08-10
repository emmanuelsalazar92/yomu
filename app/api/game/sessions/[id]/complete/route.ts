import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateScore } from "@/lib/pedagogy";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await prisma.gameSession.findFirst({ where: { id, status: "ACTIVE" } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    const totals = await prisma.attempt.aggregate({
      where: { sessionId: id },
      _sum: { firstTryCorrectSpaces: true, totalSpaces: true }
    });
    const score = calculateScore(
      totals._sum.firstTryCorrectSpaces || 0,
      totals._sum.totalSpaces || 0
    );
    await prisma.gameSession.update({
      where: { id },
      data: { status: "COMPLETED", score, completedAt: new Date() }
    });
    return NextResponse.json({ score });
  } catch {
    return NextResponse.json({ error: "No se pudo finalizar" }, { status: 400 });
  }
}
