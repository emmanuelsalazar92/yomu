import { NextResponse } from "next/server";
import { removeMedia, storeMedia } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/security";

async function removeIfUnreferenced(relativePath: string | null) {
  if (!relativePath) return;
  const references = await prisma.word.count({ where: { imagePath: relativePath } });
  if (references === 0) await removeMedia(relativePath);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminApi();
    const { id } = await params;
    const word = await prisma.word.findFirst({ where: { id, deletedAt: null } });
    if (!word) return NextResponse.json({ error: "Palabra no encontrada" }, { status: 404 });

    const form = await request.formData();
    const image = form.get("image");
    const remove = form.get("remove") === "true";
    if (!(image instanceof File) && !remove)
      return NextResponse.json({ error: "Selecciona una imagen" }, { status: 400 });

    let storedImage: Awaited<ReturnType<typeof storeMedia>> = null;
    try {
      storedImage = !remove && image instanceof File ? await storeMedia(image, "image") : null;
      if (!storedImage && !remove)
        return NextResponse.json({ error: "La imagen está vacía" }, { status: 400 });

      const updated = await prisma.word.update({
        where: { id },
        data: {
          imagePath: remove ? null : storedImage?.path,
          imageMime: remove ? null : storedImage?.mime
        },
        include: { category: true, configurations: { where: { active: true } } }
      });
      if (word.imagePath) await removeIfUnreferenced(word.imagePath).catch(() => {});
      return NextResponse.json(updated);
    } catch (error) {
      await removeMedia(storedImage?.path);
      throw error;
    }
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      {
        error: unauthorized
          ? "No autorizado"
          : error instanceof Error
            ? error.message
            : "No se pudo actualizar la imagen"
      },
      { status: unauthorized ? 401 : 400 }
    );
  }
}
