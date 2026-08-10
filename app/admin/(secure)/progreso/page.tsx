import { prisma } from "@/lib/prisma";
import ProgressManager from "./progress-manager";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [progress, activities, activityWords] = await Promise.all([
    prisma.wordSkillProgress.findMany({
      include: { word: true, childProfile: true }, orderBy: { updatedAt: "desc" }, take: 100
    }),
    prisma.activitySkillProgress.findMany({
      include: { childProfile: true }, orderBy: { updatedAt: "desc" }, take: 300
    }),
    prisma.word.findMany({ where: { deletedAt: null }, select: { id: true, text: true } })
  ]);
  return <ProgressManager initialProgress={JSON.parse(JSON.stringify(progress))} activityProgress={JSON.parse(JSON.stringify(activities))} wordNames={Object.fromEntries(activityWords.map((word) => [word.id, word.text]))} />;
}
