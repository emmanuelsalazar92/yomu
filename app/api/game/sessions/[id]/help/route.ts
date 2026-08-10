import { NextResponse } from "next/server";
import { publicTarget, recordTargetAction } from "@/lib/session-targets";
import { targetHelpSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = targetHelpSchema.parse(await request.json());
    const result = await recordTargetAction({
      sessionId: id,
      sessionExerciseId: input.sessionExerciseId,
      position: input.position,
      action: {
        kind: "HELP",
        reveal: input.reveal,
        responseTimeMs: input.responseTimeMs,
        audioPlayCount: input.audioPlayCount
      }
    });
    return NextResponse.json({
      target: publicTarget(result.target),
      alreadyRecorded: result.alreadyRecorded,
      exerciseComplete: Boolean(result.attempt),
      attemptId: result.attempt?.id ?? null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ayuda inválida" },
      { status: 400 }
    );
  }
}
