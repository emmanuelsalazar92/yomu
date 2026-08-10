import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";

const schema = z.object({ action: z.enum(["reset", "reactivate"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const { action } = schema.parse(await request.json());
    const progress = await prisma.wordSkillProgress.update({
      where: { id },
      data:
        action === "reset"
          ? {
              state: "NEW",
              attempts: 0,
              firstTryCorrect: 0,
              recentAccuracy: 0,
              distinctSessions: 0,
              lastPracticedAt: null
            }
          : { state: "LEARNING" },
      include: { word: true, childProfile: true }
    });
    return NextResponse.json(progress);
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "Solicitud inválida" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
