import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";

const schema = z
  .object({
    feedbackDelayMs: z.number().int().min(300).max(10000),
    incorrectFeedbackDelayMs: z.number().int().min(600).max(15000)
  })
  .refine((value) => value.incorrectFeedbackDelayMs >= value.feedbackDelayMs, {
    message: "El tiempo incorrecto debe ser igual o mayor al correcto."
  });

export async function PATCH(request: Request) {
  try {
    await requireAdminApi();
    const input = schema.parse(await request.json());
    const settings = await prisma.appSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...input },
      update: input
    });
    return NextResponse.json({
      feedbackDelayMs: settings.feedbackDelayMs,
      incorrectFeedbackDelayMs: settings.incorrectFeedbackDelayMs
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        error: unauthorized
          ? "No autorizado"
          : error instanceof Error
            ? error.message
            : "Tiempos inválidos"
      },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
