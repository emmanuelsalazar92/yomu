import { prisma } from "@/lib/prisma";
import WordManager from "./word-manager";
export const dynamic = "force-dynamic";
export default async function WordsPage() {
  const [words, categories] = await Promise.all([
    prisma.word.findMany({
      where: { deletedAt: null },
      include: { category: true, configurations: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } })
  ]);
  return <WordManager initialWords={JSON.parse(JSON.stringify(words))} categories={categories} />;
}
