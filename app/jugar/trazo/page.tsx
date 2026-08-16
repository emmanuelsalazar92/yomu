import TracePractice from "./trace-practice";

export const metadata = { title: "Trazar letras" };

export default async function TracePracticePage({
  searchParams
}: {
  searchParams: Promise<{ perfil?: string; nivel?: string; idioma?: string }>;
}) {
  const { perfil, nivel, idioma } = await searchParams;
  const parsedLevel = Number(nivel);
  const level = parsedLevel === 2 || parsedLevel === 3 ? parsedLevel : 1;
  return <TracePractice profileId={perfil ?? ""} level={level} language={idioma === "en" ? "en" : "es"} />;
}
