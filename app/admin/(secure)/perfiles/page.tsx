import { prisma } from "@/lib/prisma";
import ProfileManager from "./profile-manager";
export const dynamic = "force-dynamic";
export default async function ProfilesPage() {
  const items = await prisma.childProfile.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <ProfileManager initialProfiles={items} />
  );
}
