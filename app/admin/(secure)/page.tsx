import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function AdminDashboard() {
  const [words, profiles, sessions, progress, attempts] = await Promise.all([
    prisma.word.count({ where: { active: true, deletedAt: null } }),
    prisma.childProfile.count({ where: { active: true } }),
    prisma.gameSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 6,
      include: { childProfile: true }
    }),
    prisma.wordSkillProgress.groupBy({ by: ["state"], _count: true }),
    prisma.attempt.aggregate({ _sum: { firstTryCorrectSpaces: true, totalSpaces: true } })
  ]);
  const counts = Object.fromEntries(progress.map((item) => [item.state, item._count]));
  const correct = attempts._sum.firstTryCorrectSpaces || 0,
    total = attempts._sum.totalSpaces || 0;
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Panel de aprendizaje</p>
          <h1>Así va Yomu</h1>
        </div>
      </div>
      <section className="metric-grid">
        <div className="metric-card">
          <span>Palabras activas</span>
          <strong>{words}</strong>
        </div>
        <div className="metric-card">
          <span>Perfiles</span>
          <strong>{profiles}</strong>
        </div>
        <div className="metric-card">
          <span>Aprendidas</span>
          <strong>{counts.LEARNED || 0}</strong>
        </div>
        <div className="metric-card">
          <span>Precisión general</span>
          <strong>{total ? Math.round((correct / total) * 100) : 0}%</strong>
        </div>
      </section>
      <div className="admin-grid">
        <section className="panel">
          <h2>Estado del aprendizaje</h2>
          <p>
            Nuevas: <strong>{counts.NEW || 0}</strong>
          </p>
          <p>
            Aprendiendo: <strong>{(counts.LEARNING || 0) + (counts.ALMOST_LEARNED || 0)}</strong>
          </p>
          <p>
            Aprendidas: <strong>{counts.LEARNED || 0}</strong>
          </p>
        </section>
        <section className="panel">
          <h2>Sesiones recientes</h2>
          {sessions.length ? (
            sessions.map((session) => (
              <p key={session.id}>
                <strong>{session.childProfile.nickname}</strong> ·{" "}
                {session.actualCount || session.requestedCount} ejercicios · {session.score ?? "—"}%
              </p>
            ))
          ) : (
            <p className="help-text">Aún no hay sesiones terminadas.</p>
          )}
        </section>
      </div>
    </>
  );
}
