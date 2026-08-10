import { NextResponse } from "next/server";
import { learningSessionSchema } from "@/lib/validation";
import { createLearningSession } from "@/lib/learning-session";

export async function POST(request: Request) {
  try {
    const input = learningSessionSchema.parse(await request.json());
    return NextResponse.json(await createLearningSession(input), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo iniciar la actividad." }, { status: 400 });
  }
}
