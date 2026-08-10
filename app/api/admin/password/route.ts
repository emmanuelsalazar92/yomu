import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";
const schema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(12).max(200)
});
export async function POST(request: Request) {
  try {
    const id = await requireAdminApi();
    const input = schema.parse(await request.json());
    const user = await prisma.adminUser.findUniqueOrThrow({ where: { id } });
    if (!(await compare(input.currentPassword, user.passwordHash)))
      return NextResponse.json({ error: "Contraseña inválida" }, { status: 401 });
    await prisma.adminUser.update({
      where: { id },
      data: { passwordHash: await hash(input.newPassword, 12) }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "No autorizado"
            : "Solicitud inválida"
      },
      { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 400 }
    );
  }
}
