import { NextResponse } from "next/server";
import { completeDailyJourney, dailyJourneyResponse } from "@/lib/daily-journey";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const journey = await completeDailyJourney(id);
    return NextResponse.json(dailyJourneyResponse(journey));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo completar la ruta" },
      { status: 400 }
    );
  }
}
