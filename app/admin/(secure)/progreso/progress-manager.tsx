"use client";

import { useState } from "react";

type ProgressItem = {
  id: string;
  helpMode: string;
  exerciseType: string;
  recentAccuracy: number;
  state: string;
  word: { text: string };
  childProfile: { nickname: string };
};
type ActivityProgress = {
  id: string;
  activityType: string;
  skillKey: string;
  mode: string;
  recentAccuracy: number;
  state: string;
  attempts: number;
  firstTryCorrect: number;
  assistedCount: number;
  skippedCount: number;
  childProfile: { id: string; nickname: string };
};

const activityNames: Record<string, string> = {
  CASE_MATCH: "Mayúscula y minúscula",
  NAME_TILES: "Construye tu nombre",
  SYLLABLE_COUNT: "¿Cuántas sílabas?",
  INITIAL_SOUND: "Sonido inicial",
  SYLLABLE_BUILD: "Construye la palabra",
  ENGLISH_CASE_MATCH: "English: big and small letters",
  ENGLISH_VOCABULARY: "English: listen and choose",
  ENGLISH_INITIAL_SOUND: "English: beginning sounds",
  ENGLISH_CVC_BUILD: "English: build a word",
  ENGLISH_SIGHT_WORD: "English: sight words",
  MATH_NUMBER_QUANTITY: "Matemáticas: número y cantidad",
  MATH_COUNT_OBJECTS: "Matemáticas: cuenta objetos",
  MATH_COMPARE_QUANTITIES: "Matemáticas: compara cantidades",
  MATH_NUMBER_SEQUENCE: "Matemáticas: secuencias",
  MATH_ADDITION: "Matemáticas: sumas",
  MATH_SUBTRACTION: "Matemáticas: restas",
  MATH_PLACE_VALUE: "Matemáticas: decenas y unidades",
  MATH_COMPARE_TWO_DIGIT: "Matemáticas: compara dos dígitos",
  MATH_ADDITION_TWO_DIGIT: "Matemáticas: sumas de dos dígitos",
  MATH_SUBTRACTION_TWO_DIGIT: "Matemáticas: restas de dos dígitos",
  MATH_STORY_ADDITION: "Matemáticas: problemas para juntar",
  MATH_STORY_SUBTRACTION: "Matemáticas: problemas para quitar",
  LOGIC_SHAPE: "Lógica: formas",
  LOGIC_SORT: "Lógica: clasificación",
  LOGIC_PATTERN: "Lógica: patrones",
  LOGIC_POSITION: "Lógica: posiciones",
  LOGIC_MEASURE: "Lógica: medidas",
  STORY_CHARACTER: "Cuentos: personaje",
  STORY_SETTING: "Cuentos: lugar",
  STORY_SEQUENCE: "Cuentos: secuencia",
  STORY_COMPREHENSION: "Cuentos: comprensión",
  STORY_VOCABULARY: "Cuentos: vocabulario"
};

export default function ProgressManager({
  initialProgress,
  activityProgress,
  wordNames
}: {
  initialProgress: ProgressItem[];
  activityProgress: ActivityProgress[];
  wordNames: Record<string, string>;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [profileFilter, setProfileFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");
  const filteredActivities = activityProgress.filter(
    (item) =>
      (profileFilter === "ALL" || item.childProfile.id === profileFilter) &&
      (activityFilter === "ALL" || item.activityType === activityFilter) &&
      (modeFilter === "ALL" || item.mode === modeFilter)
  );
  const profiles = [
    ...new Map(activityProgress.map((item) => [item.childProfile.id, item.childProfile])).values()
  ];
  const modes = [...new Set(activityProgress.map((item) => item.mode))].sort();
  const totalAttempts = filteredActivities.reduce((sum, item) => sum + item.attempts, 0);
  const weightedAccuracy = totalAttempts
    ? filteredActivities.reduce((sum, item) => sum + item.recentAccuracy * item.attempts, 0) /
      totalAttempts
    : 0;

  async function update(id: string, action: "reset" | "reactivate") {
    const response = await fetch(`/api/admin/progress/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (!response.ok) return;
    const updated = (await response.json()) as ProgressItem;
    setProgress((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h1>Progreso</h1>
        </div>
      </div>
      <section className="panel activity-progress-panel">
        <h2>Actividades independientes</h2>
        <div className="setup-filters activity-progress-filters">
          <div className="form-field">
            <label htmlFor="progress-profile">Perfil</label>
            <select
              id="progress-profile"
              className="select"
              value={profileFilter}
              onChange={(event) => setProfileFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              {profiles.map((profile) => (
                <option value={profile.id} key={profile.id}>
                  {profile.nickname}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="progress-activity">Actividad</label>
            <select
              id="progress-activity"
              className="select"
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {Object.entries(activityNames).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="progress-mode">Modo</label>
            <select
              id="progress-mode"
              className="select"
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
            >
              <option value="ALL">Todos</option>
              {modes.map((mode) => (
                <option value={mode} key={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <strong>{totalAttempts}</strong>
            <span>respuestas</span>
          </div>
          <div className="metric">
            <strong>{Math.round(weightedAccuracy * 100)}%</strong>
            <span>precisión ponderada</span>
          </div>
          <div className="metric">
            <strong>{filteredActivities.filter((item) => item.state === "LEARNED").length}</strong>
            <span>habilidades aprendidas</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Perfil</th>
                <th>Actividad</th>
                <th>Habilidad</th>
                <th>Modo</th>
                <th>Intentos</th>
                <th>Ayudas / saltos</th>
                <th>Precisión</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((item) => (
                <tr key={item.id}>
                  <td>{item.childProfile.nickname}</td>
                  <td>{activityNames[item.activityType] || item.activityType}</td>
                  <td>
                    <strong>
                      {item.skillKey.startsWith("WORD:")
                        ? wordNames[item.skillKey.slice(5)] || "Palabra histórica"
                        : item.skillKey.startsWith("COUNT:")
                          ? `${item.skillKey.slice(6)} sílabas`
                          : item.skillKey}
                    </strong>
                  </td>
                  <td>{item.mode}</td>
                  <td>{item.attempts}</td>
                  <td>
                    {item.assistedCount} / {item.skippedCount}
                  </td>
                  <td>{Math.round(item.recentAccuracy * 100)}%</td>
                  <td>
                    <span className="badge">{item.state}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredActivities.length && (
            <div className="empty-card">Aún no hay progreso con estos filtros.</div>
          )}
        </div>
      </section>
      <h2 className="legacy-progress-title">Palabras y letras ocultas</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Palabra</th>
              <th>Modalidad</th>
              <th>Ejercicio</th>
              <th>Precisión</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((item) => (
              <tr key={item.id}>
                <td>{item.childProfile.nickname}</td>
                <td>
                  <strong>{item.word.text}</strong>
                </td>
                <td>{item.helpMode}</td>
                <td>{item.exerciseType}</td>
                <td>{Math.round(item.recentAccuracy * 100)}%</td>
                <td>
                  <span className="badge">{item.state}</span>
                </td>
                <td>
                  <div className="pill-row">
                    <button
                      className="admin-button"
                      style={{ minHeight: 38 }}
                      onClick={() => void update(item.id, "reactivate")}
                    >
                      Reactivar
                    </button>
                    <button
                      className="secondary-button"
                      style={{ minHeight: 38, paddingInline: 14 }}
                      onClick={() =>
                        window.confirm("¿Reiniciar todo el progreso de esta habilidad?") &&
                        void update(item.id, "reset")
                      }
                    >
                      Reiniciar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!progress.length && (
          <div className="empty-card" style={{ margin: 20 }}>
            El progreso aparecerá después de la primera sesión.
          </div>
        )}
      </div>
    </>
  );
}
