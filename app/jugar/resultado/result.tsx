"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function ResultView() {
  const [result, setResult] = useState({ correct: 0, total: 0, words: 0, sessionTotal: 0 });
  useEffect(() => {
    const raw = sessionStorage.getItem("yomu-result");
    if (raw) {
      const timer = window.setTimeout(() => setResult(JSON.parse(raw)), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const score = result.total ? Math.round((result.correct / result.total) * 100) : 0;
  return (
    <main className="result">
      <section className="result-card">
        <div style={{ fontSize: "4rem" }}>🌟</div>
        <p className="eyebrow">Sesión terminada</p>
        <h1>¡Lo estás haciendo muy bien!</h1>
        <div className="result-score">{score}%</div>
        <div className="stat-grid">
          <div className="stat">
            <strong>
              {result.words}/{result.sessionTotal || result.words}
            </strong>{" "}
            ejercicios completados
          </div>
          <div className="stat">
            <strong>
              {result.correct}/{result.total}
            </strong>{" "}
            vocales al primer intento
          </div>
        </div>
        <Link className="primary-button" href="/">
          Jugar otra vez
        </Link>
      </section>
    </main>
  );
}
