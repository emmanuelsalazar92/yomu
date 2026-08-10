"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Result = {
  correct: number;
  incorrect: number;
  assisted: number;
  skipped: number;
  total: number;
  words: number;
  sessionTotal: number;
  targetKind: "VOWEL" | "CONSONANT";
  practicedLetters: string[];
  difficultLetters: string[];
  reviewWords: string[];
  sessionId: string;
};

const emptyResult: Result = {
  correct: 0,
  incorrect: 0,
  assisted: 0,
  skipped: 0,
  total: 0,
  words: 0,
  sessionTotal: 0,
  targetKind: "VOWEL",
  practicedLetters: [],
  difficultLetters: [],
  reviewWords: [],
  sessionId: ""
};

export default function ResultView() {
  const router = useRouter();
  const [result, setResult] = useState<Result>(emptyResult);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const raw = sessionStorage.getItem("yomu-result");
    if (raw) {
      const timer = window.setTimeout(() => setResult({ ...emptyResult, ...JSON.parse(raw) }), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const score = result.total ? Math.round((result.correct / result.total) * 100) : 0;

  async function startReview() {
    if (!result.sessionId || reviewing) return;
    setReviewing(true);
    setError("");
    try {
      const response = await fetch(`/api/game/sessions/${result.sessionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey: crypto.randomUUID() })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo preparar el repaso.");
      router.push(`/jugar/sesion?resume=${payload.sessionId}`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "No se pudo preparar el repaso.");
      setReviewing(false);
    }
  }

  const needsReview = result.incorrect + result.assisted + result.skipped > 0;
  return (
    <main className="result">
      <section className="result-card">
        <div style={{ fontSize: "4rem" }}>🌟</div>
        <p className="eyebrow">Sesión terminada</p>
        <h1>¡Terminaste tu práctica!</h1>
        <div className="result-score">{score}%</div>
        <p>
          Acertaste sin ayuda <strong>{result.correct} de {result.total}</strong> letras.
        </p>
        <div className="stat-grid result-breakdown">
          <div className="stat"><strong>{result.correct}</strong> correctas</div>
          <div className="stat"><strong>{result.incorrect}</strong> incorrectas</div>
          <div className="stat"><strong>{result.assisted}</strong> con ayuda</div>
          <div className="stat"><strong>{result.skipped}</strong> omitidas</div>
        </div>
        <p>{result.words}/{result.sessionTotal || result.words} ejercicios completados</p>
        {result.targetKind === "CONSONANT" && (
          <div className="stat-grid">
            <div className="stat"><strong>Practicadas:</strong> {result.practicedLetters.join(", ") || "—"}</div>
            <div className="stat"><strong>Para reforzar:</strong> {result.difficultLetters.join(", ") || "ninguna"}</div>
          </div>
        )}
        {needsReview && result.reviewWords.length > 0 && (
          <>
            <p>Podemos volver a practicar: <strong>{result.reviewWords.join(", ")}</strong></p>
            <button className="primary-button" disabled={reviewing} onClick={() => void startReview()}>
              {reviewing ? "Preparando repaso…" : "Repasar las palabras que costaron"}
            </button>
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Link className="secondary-button" href="/">Jugar otra vez</Link>
      </section>
    </main>
  );
}
