import { NextResponse } from "next/server";
import { createOrGetDailyJourney, dailyJourneyResponse } from "@/lib/daily-journey";
import { dailyJourneySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = dailyJourneySchema.parse(await request.json());
    const journey = await createOrGetDailyJourney(input.childProfileId, input.durationMinutes);
    return NextResponse.json(dailyJourneyResponse(journey));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo preparar la ruta diaria" },
      { status: 400 }
    );
  }
}
