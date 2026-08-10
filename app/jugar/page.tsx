import { prisma } from "@/lib/prisma";
import GameSetup from "./setup";

export const metadata = { title: "Preparar juego" };
export const dynamic = "force-dynamic";

export default async function PlaySetupPage({
  searchParams
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const [{ perfil }, profiles, categories] = await Promise.all([
    searchParams,
    prisma.childProfile.findMany({
      where: { active: true },
      select: { id: true, nickname: true, avatar: true, practiceName: true, nameActivityEnabled: true }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  return <GameSetup profiles={profiles} categories={categories} initialProfile={perfil} />;
}
