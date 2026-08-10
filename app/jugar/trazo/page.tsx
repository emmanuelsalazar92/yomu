import TracePractice from "./trace-practice";

export const metadata = { title: "Trazar letras" };

export default async function TracePracticePage({
  searchParams
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const { perfil } = await searchParams;
  return <TracePractice profileId={perfil ?? ""} />;
}
