import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewLearningSession } from "@/lib/learning-session";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { requestKey } = z.object({ requestKey: z.uuid() }).parse(await request.json());
    return NextResponse.json(await reviewLearningSession(id, requestKey), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el repaso." }, { status: 400 });
  }
}
