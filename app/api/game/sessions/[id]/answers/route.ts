import { NextResponse } from "next/server";
import { publicTarget, recordTargetAction } from "@/lib/session-targets";
import { targetAnswerSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = targetAnswerSchema.parse(await request.json());
    const result = await recordTargetAction({
      sessionId: id,
      sessionExerciseId: input.sessionExerciseId,
      position: input.position,
      action: {
        kind: "ANSWER",
        selectedLetter: input.selectedLetter,
        responseTimeMs: input.responseTimeMs,
        audioPlayCount: input.audioPlayCount
      }
    });
    return NextResponse.json(
      {
        target: publicTarget(result.target),
        alreadyRecorded: result.alreadyRecorded,
        exerciseComplete: Boolean(result.attempt),
        attemptId: result.attempt?.id ?? null
      },
      { status: result.alreadyRecorded ? 200 : 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Respuesta inválida" },
      { status: 400 }
    );
  }
}
