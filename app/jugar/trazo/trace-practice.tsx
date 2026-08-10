"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizeTraceRepetitions, TRACE_LETTERS } from "@/lib/trace-practice";
import TraceCanvas from "../ruta/trace-canvas";

type Phase = "SETUP" | "PRACTICE" | "COMPLETE";

export default function TracePractice({ profileId }: { profileId: string }) {
  const [letter, setLetter] = useState("M");
  const [repetitions, setRepetitions] = useState(5);
  const [phase, setPhase] = useState<Phase>("SETUP");
  const [current, setCurrent] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const backHref = profileId ? `/jugar?perfil=${profileId}` : "/";

  function start() {
    setRepetitions((value) => normalizeTraceRepetitions(value));
    setCurrent(1);
    setResetKey((value) => value + 1);
    setPhase("PRACTICE");
  }

  function completeTrace() {
    if (current >= repetitions) {
      setPhase("COMPLETE");
      return;
    }
    setCurrent((value) => value + 1);
    setResetKey((value) => value + 1);
  }

  function chooseAgain() {
    setCurrent(1);
    setResetKey((value) => value + 1);
    setPhase("SETUP");
  }

  if (phase === "COMPLETE") {
    return (
      <main className="result trace-celebration">
        <section className="result-card">
          <div className="reward-icon" aria-hidden="true">
            ✨
          </div>
          <p className="eyebrow">Serie terminada</p>
          <h1>
            ¡Trazaste la {letter} {repetitions} veces!
          </h1>
          <div className="trace-complete-letter" aria-hidden="true">
            {letter}
          </div>
          <p>Sin prisa y con mucha atención. ¡Muy buen trabajo!</p>
          <div className="daily-finish-actions">
            <button className="primary-button" type="button" onClick={start}>
              Repetir la serie
            </button>
            <button className="secondary-button" type="button" onClick={chooseAgain}>
              Elegir otra letra
            </button>
            <Link className="link-button" href={backHref}>
              Terminar
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "PRACTICE") {
    return (
      <main className="game-screen trace-practice-screen">
        <div className="game-top">
          <button
            className="icon-button"
            type="button"
            aria-label="Volver a elegir"
            onClick={chooseAgain}
          >
            ←
          </button>
          <div className="progress-track" aria-label={`Trazo ${current} de ${repetitions}`}>
            <div
              className="progress-fill"
              style={{ width: `${((current - 1) / repetitions) * 100}%` }}
            />
          </div>
          <strong>
            {current}/{repetitions}
          </strong>
        </div>
        <section className="trace-practice-card">
          <p className="eyebrow">Sin reloj · a tu ritmo</p>
          <h1>Traza la letra {letter}</h1>
          <p className="trace-series-status">
            Trazo {current} de {repetitions}
          </p>
          <TraceCanvas
            key={`${letter}-${resetKey}`}
            letter={letter}
            disabled={false}
            onComplete={completeTrace}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="setup shell trace-setup">
      <Link className="brand" href={backHref}>
        <span className="brand-mark">よ</span> Yomu
      </Link>
      <header className="trace-setup-heading">
        <p className="eyebrow">Práctica libre · sin tiempo</p>
        <h1 className="page-title">Trazar letras</h1>
        <p>Elige una letra y cuántas veces quieres dibujarla. No hay reloj.</p>
      </header>
      <section className="panel trace-setup-panel" aria-labelledby="trace-letter-title">
        <h2 id="trace-letter-title">1. Elige una letra</h2>
        <div className="trace-letter-grid">
          {TRACE_LETTERS.map((item) => (
            <button
              className={`trace-letter-option ${letter === item ? "selected" : ""}`}
              type="button"
              aria-pressed={letter === item}
              onClick={() => setLetter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <h2>2. ¿Cuántas veces?</h2>
        <div className="trace-count-row">
          {[3, 5, 10].map((value) => (
            <button
              className={`pill ${repetitions === value ? "selected" : ""}`}
              type="button"
              aria-pressed={repetitions === value}
              onClick={() => setRepetitions(value)}
              key={value}
            >
              {value} veces
            </button>
          ))}
          <label className="trace-custom-count">
            Otra cantidad
            <input
              className="input"
              type="number"
              min="1"
              max="50"
              value={repetitions}
              onChange={(event) => setRepetitions(Number(event.target.value))}
              onBlur={() => setRepetitions((value) => normalizeTraceRepetitions(value))}
              aria-label="Cantidad personalizada"
            />
          </label>
        </div>
        <button className="primary-button trace-start-button" type="button" onClick={start}>
          Trazar {letter} · {normalizeTraceRepetitions(repetitions)} veces
        </button>
      </section>
    </main>
  );
}
