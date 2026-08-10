import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionAvailability } from "@/lib/session-selection";
import { sessionOptionsSchema } from "@/lib/validation";
import { MIN_ACTIVE_CONSONANTS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const input = sessionOptionsSchema.parse(await request.json());
    const profile = await prisma.childProfile.findFirst({
      where: { id: input.childProfileId, active: true },
      select: { id: true }
    });
    if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
    const availability = await getSessionAvailability(input);
    if (
      input.exerciseType === "SINGLE_CONSONANT" &&
      availability.activeConsonants.length < MIN_ACTIVE_CONSONANTS
    ) {
      return NextResponse.json({
        ...availability,
        availableCount: 0,
        actualCount: 0,
        message: "Un adulto debe activar al menos tres consonantes en Ajustes."
      });
    }
    return NextResponse.json({
      ...availability,
      message:
        availability.availableCount === 0
          ? "No hay palabras que cumplan esta configuración. Prueba otra ayuda, reto o filtro."
          : availability.actualCount < availability.requestedCount
            ? `Hay ${availability.availableCount} palabras únicas disponibles; la sesión tendrá ${availability.actualCount}.`
            : `Hay ${availability.availableCount} palabras únicas disponibles.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud inválida" },
      { status: 400 }
    );
  }
}
