import { prisma } from "@/lib/prisma";
import SimpleManager from "../simple-manager";
export const dynamic = "force-dynamic";
export default async function ProfilesPage() {
  const items = await prisma.childProfile.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <SimpleManager
      title="Perfiles infantiles"
      kind="profiles"
      items={items.map((item) => ({
        id: item.id,
        name: item.nickname,
        detail: item.avatar || "🌱"
      }))}
    />
  );
}
