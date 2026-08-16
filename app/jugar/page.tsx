import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import GameSetup from "./setup";

export const metadata = { title: "Preparar juego" };
export const dynamic = "force-dynamic";

export default async function PlaySetupPage({
  searchParams
}: {
  searchParams: Promise<{ perfil?: string; idioma?: string; materia?: string }>;
}) {
  const { perfil, idioma, materia } = await searchParams;
  if (!perfil) redirect("/");
  const profile = await prisma.childProfile.findFirst({
    where: { id: perfil, active: true },
    select: {
      id: true,
      nickname: true,
      avatar: true,
      practiceName: true,
      nameActivityEnabled: true
    }
  });
  if (!profile) redirect("/");
  const progress = await prisma.activitySkillProgress.findMany({
    where: { childProfileId: profile.id },
    select: { activityType: true, attempts: true, firstTryCorrect: true, assistedCount: true }
  });
  const area =
    materia === "matematicas"
      ? "math"
      : materia === "logica"
        ? "logic"
        : materia === "cuentos"
          ? "stories"
          : idioma === "en"
            ? "en"
            : "es";
  return <GameSetup profile={profile} area={area} progress={progress} />;
}
