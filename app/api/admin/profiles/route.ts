import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";
import { profileSchema } from "@/lib/validation";
import { validatePracticeName } from "@/lib/learning-activities";
export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const input = profileSchema.parse(await request.json());
    const practice = input.practiceName ? validatePracticeName(input.practiceName) : null;
    if (input.nameActivityEnabled && (!practice || !practice.valid)) {
      return NextResponse.json(
        { error: practice?.error || "Configura un nombre para practicar." },
        { status: 400 }
      );
    }
    const profile = await prisma.childProfile.create({
      data: {
        nickname: input.nickname,
        avatar: input.avatar || null,
        practiceName: practice?.valid ? practice.normalized : null,
        nameActivityEnabled: input.nameActivityEnabled
      }
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "No autorizado"
            : "Datos inválidos"
      },
      { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400 }
    );
  }
}
