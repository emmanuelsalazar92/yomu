import { NextResponse } from "next/server";
import { getLearningSession } from "@/lib/learning-session";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getLearningSession(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sesión no encontrada." }, { status: 404 });
  }
}
