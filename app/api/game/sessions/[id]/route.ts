import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { persistedSessionInclude, sessionResponse } from "@/lib/session-response";
import { ensureSessionTargetsForSession } from "@/lib/session-targets";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exists = await prisma.gameSession.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    await ensureSessionTargetsForSession(id);
    const [session, settings] = await Promise.all([
      prisma.gameSession.findUniqueOrThrow({ where: { id }, include: persistedSessionInclude }),
      prisma.appSettings.findUnique({ where: { id: "default" } })
    ]);
    return NextResponse.json(sessionResponse(session, settings));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo recuperar la sesión" },
      { status: 400 }
    );
  }
}
