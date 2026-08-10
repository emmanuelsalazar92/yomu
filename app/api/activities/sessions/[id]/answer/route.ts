import { NextResponse } from "next/server";
import { learningAnswerSchema } from "@/lib/validation";
import { recordLearningAction } from "@/lib/learning-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = learningAnswerSchema.parse(await request.json());
    return NextResponse.json(await recordLearningAction({ sessionId: id, ...input }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la respuesta." }, { status: 400 });
  }
}
