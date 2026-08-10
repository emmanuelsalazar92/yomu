import { prisma } from "@/lib/prisma";
import SimpleManager from "../simple-manager";
export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  const items = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <SimpleManager
      title="Categorías"
      kind="categories"
      items={items.map((item) => ({ id: item.id, name: item.name, detail: item.color }))}
    />
  );
}
