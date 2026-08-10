import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dailyJourneyInclude, dailyJourneyResponse } from "@/lib/daily-journey";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const journey = await prisma.dailyJourney.findUnique({
      where: { id },
      include: dailyJourneyInclude
    });
    if (!journey) return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
    return NextResponse.json(dailyJourneyResponse(journey));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo recuperar la ruta" },
      { status: 400 }
    );
  }
}
