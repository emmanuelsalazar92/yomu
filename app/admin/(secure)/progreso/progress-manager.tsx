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

export default function ProgressManager({ initialProgress }: { initialProgress: ProgressItem[] }) {
  const [progress, setProgress] = useState(initialProgress);

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
