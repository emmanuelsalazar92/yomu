import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ActivitySetup from "./setup";

export const dynamic = "force-dynamic";

export default async function ActivitySetupPage({ searchParams }: { searchParams: Promise<{ tipo?: string; perfil?: string }> }) {
  const { tipo, perfil } = await searchParams;
  if (!tipo || !["CASE_MATCH", "NAME_TILES", "SYLLABLE_COUNT"].includes(tipo)) notFound();
  const [profile, categories] = await Promise.all([
    prisma.childProfile.findFirst({ where: { id: perfil, active: true }, select: { id: true, nickname: true, avatar: true, practiceName: true, nameActivityEnabled: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  if (!profile) notFound();
  if (tipo === "NAME_TILES" && (!profile.nameActivityEnabled || !profile.practiceName)) notFound();
  return <ActivitySetup type={tipo as "CASE_MATCH" | "NAME_TILES" | "SYLLABLE_COUNT"} profile={profile} categories={categories} />;
}
