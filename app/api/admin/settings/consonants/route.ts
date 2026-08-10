import { NextResponse } from "next/server";
import { z } from "zod";
import { CONSONANT_OPTIONS, MIN_ACTIVE_CONSONANTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";

const schema = z.object({
  activeConsonants: z.array(z.enum(CONSONANT_OPTIONS)).min(MIN_ACTIVE_CONSONANTS)
});

export async function PATCH(request: Request) {
  try {
    await requireAdminApi();
    const input = schema.parse(await request.json());
    const activeConsonants = [...new Set(input.activeConsonants)];
    const settings = await prisma.appSettings.upsert({
      where: { id: "default" },
      create: { id: "default", activeConsonants },
      update: { activeConsonants }
    });
    return NextResponse.json({ activeConsonants: settings.activeConsonants });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "Selecciona al menos tres consonantes válidas." },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
