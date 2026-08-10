import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordDailyAnswer } from "@/lib/daily-journey";
import { dailyAnswerSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = dailyAnswerSchema.parse(await request.json());
    const result = await recordDailyAnswer({
      journeyId: id,
      activityId: input.activityId,
      position: input.position,
      action: input.action,
      selectedPiece: input.selectedPiece,
      tracePoints: input.tracePoints,
      responseTimeMs: input.responseTimeMs
    });
    const activity = await prisma.dailyActivity.findUniqueOrThrow({
      where: { id: input.activityId },
      include: { targets: { orderBy: { targetPosition: "asc" } } }
    });
    return NextResponse.json({
      target: {
        id: result.target.id,
        position: result.target.targetPosition,
        expectedPiece: result.target.expectedPiece,
        selectedPiece: result.target.selectedPiece,
        outcome: result.target.outcome,
        helpUsed: result.target.helpUsed,
        answeredAt: result.target.answeredAt
      },
      alreadyRecorded: result.alreadyRecorded,
      activityComplete: activity.targets.every((target) => target.outcome !== null),
      activityOutcome: activity.outcome
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Respuesta inválida" },
      { status: 400 }
    );
  }
}
