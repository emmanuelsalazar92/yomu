"use client";

import { useState } from "react";

export default function FeedbackSettings({
  initialCorrectMs,
  initialIncorrectMs
}: {
  initialCorrectMs: number;
  initialIncorrectMs: number;
}) {
  const [correctMs, setCorrectMs] = useState(initialCorrectMs);
  const [incorrectMs, setIncorrectMs] = useState(initialIncorrectMs);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch("/api/admin/settings/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedbackDelayMs: correctMs, incorrectFeedbackDelayMs: incorrectMs })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Tiempos guardados." : payload.error || "No se pudo guardar.");
    setBusy(false);
  }

  return (
    <div className="form-grid" style={{ marginTop: 16 }}>
      <label>
        Respuesta correcta (milisegundos)
        <input type="number" min={300} max={10000} step={100} value={correctMs} onChange={(event) => setCorrectMs(Number(event.target.value))} />
      </label>
      <label>
        Respuesta incorrecta, con ayuda u omitida (milisegundos)
        <input type="number" min={600} max={15000} step={100} value={incorrectMs} onChange={(event) => setIncorrectMs(Number(event.target.value))} />
      </label>
      <button className="admin-button" type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Guardando…" : "Guardar tiempos"}
      </button>
      <p className="help-text" role="status">{message}</p>
    </div>
  );
}
