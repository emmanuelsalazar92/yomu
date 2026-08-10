"use client";

import { useState } from "react";
import { CONSONANT_OPTIONS, MIN_ACTIVE_CONSONANTS } from "@/lib/constants";

export default function ConsonantSettings({ initialValue }: { initialValue: string[] }) {
  const [selected, setSelected] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(letter: string) {
    setSelected((current) =>
      current.includes(letter) ? current.filter((item) => item !== letter) : [...current, letter]
    );
    setMessage("");
  }

  async function save() {
    if (selected.length < MIN_ACTIVE_CONSONANTS) {
      setMessage("Selecciona al menos tres consonantes.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/admin/settings/consonants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeConsonants: selected })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Consonantes guardadas." : payload.error || "No se pudo guardar.");
    setBusy(false);
  }

  return (
    <div>
      <div className="letter-picker" style={{ margin: "16px 0" }}>
        {CONSONANT_OPTIONS.map((letter) => (
          <button
            className={`letter-choice consonant ${selected.includes(letter) ? "selected" : ""}`}
            aria-pressed={selected.includes(letter)}
            type="button"
            key={letter}
            onClick={() => toggle(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
      <button className="admin-button" type="button" disabled={busy} onClick={() => void save()}>
        {busy ? "Guardando…" : "Guardar consonantes"}
      </button>
      <p
        className={selected.length < MIN_ACTIVE_CONSONANTS ? "error-text" : "help-text"}
        role="status"
      >
        {message || `${selected.length} consonantes activas: ${selected.join(", ")}`}
      </p>
    </div>
  );
}
