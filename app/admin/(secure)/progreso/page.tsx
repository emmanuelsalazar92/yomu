import { prisma } from "@/lib/prisma";
import ProgressManager from "./progress-manager";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const progress = await prisma.wordSkillProgress.findMany({
    include: { word: true, childProfile: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return <ProgressManager initialProgress={JSON.parse(JSON.stringify(progress))} />;
}
