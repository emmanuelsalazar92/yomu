import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";
import { categorySchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    await requireAdminApi();
    const input = categorySchema.parse(await request.json());
    const category = await prisma.category.create({ data: input });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "No autorizado"
            : "Datos inválidos o nombre repetido"
      },
      { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400 }
    );
  }
}
