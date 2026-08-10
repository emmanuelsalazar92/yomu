import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function profiles() {
  try {
    return await prisma.childProfile.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" }
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const children = await profiles();
  return (
    <main>
      <header className="site-header shell">
        <Link href="/" className="brand" aria-label="Yomu, inicio">
          <span className="brand-mark">よ</span> Yomu
        </Link>
        <span className="eyebrow">Leer es descubrir</span>
      </header>
      {children.length ? (
        <section className="profiles shell">
          <p className="eyebrow">¡Hola!</p>
          <h1>¿Quién va a jugar?</h1>
          <div className="profile-grid">
            {children.map((child) => (
              <Link className="profile-card" href={`/jugar?perfil=${child.id}`} key={child.id}>
                <span className="profile-avatar" aria-hidden="true">
                  {child.avatar || "🌱"}
                </span>
                <strong>{child.nickname}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="hero shell">
          <div>
            <p className="eyebrow">Vocales · palabras · confianza</p>
            <h1>
              Pequeñas letras, <span>grandes logros.</span>
            </h1>
            <p className="hero-copy">
              Yomu acompaña los primeros pasos de lectura con sesiones amables, sencillas y hechas
              al ritmo de cada niño.
            </p>
            <Link className="primary-button" href="/admin/login">
              Preparar Yomu <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hero-card" aria-label="Ejemplo de ejercicio con la palabra vaca">
            <div className="word-demo">
              <div className="picture">🐄</div>
              <div className="word">
                V<span className="blank">_</span>CA
              </div>
              <div className="vowel-row" aria-hidden="true">
                {["A", "E", "I", "O", "U"].map((v) => (
                  <span className="vowel-button" key={v}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
