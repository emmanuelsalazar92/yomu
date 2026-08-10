import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";
import { profileSchema } from "@/lib/validation";
import { validatePracticeName } from "@/lib/learning-activities";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await context.params;
    const input = profileSchema.parse(await request.json());
    const practice = input.practiceName ? validatePracticeName(input.practiceName) : null;
    if (input.nameActivityEnabled && (!practice || !practice.valid)) {
      return NextResponse.json(
        { error: practice?.error || "Configura un nombre para practicar." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      await prisma.childProfile.update({
        where: { id },
        data: {
          nickname: input.nickname,
          avatar: input.avatar || null,
          practiceName: practice?.valid ? practice.normalized : null,
          nameActivityEnabled: input.nameActivityEnabled
        }
      })
    );
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : error instanceof Error ? error.message : "Datos inválidos" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
