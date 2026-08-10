import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";

const schema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const input = schema.parse(await request.json());
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
    return NextResponse.json(await prisma.word.update({ where: { id }, data: input }));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "Solicitud inválida" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });
    await prisma.word.update({
      where: { id },
      data: { active: false, deletedAt: new Date() }
    });
    return NextResponse.json({ id, deleted: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "No autorizado" : "No se pudo eliminar la palabra" },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
