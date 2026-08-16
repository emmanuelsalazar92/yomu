"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizeTraceRepetitions, TRACE_LETTERS } from "@/lib/trace-practice";
import { useWordSpeaker } from "@/lib/use-word-speaker";
import TraceCanvas from "../ruta/trace-canvas";

type Phase = "SETUP" | "PRACTICE" | "COMPLETE";

export default function TracePractice({
  profileId,
  level = 1,
  language = "es"
}: {
  profileId: string;
  level?: 1 | 2 | 3;
  language?: "es" | "en";
}) {
  const [letter, setLetter] = useState("M");
  const [repetitions] = useState(level === 1 ? 3 : level === 2 ? 5 : 10);
  const [phase, setPhase] = useState<Phase>("SETUP");
  const [current, setCurrent] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const speaker = useWordSpeaker(letter);
  const backHref = profileId
    ? `/jugar?perfil=${profileId}${language === "en" ? "&idioma=en" : ""}`
    : "/";

  function start() {
    setCurrent(1);
    setResetKey((value) => value + 1);
    setPhase("PRACTICE");
    if (language === "en") void speaker.play(letter.toLocaleLowerCase("en-US"), null, "en-US");
  }

  function chooseLetter(value: string) {
    setLetter(value);
    if (language === "en") void speaker.play(value.toLocaleLowerCase("en-US"), null, "en-US");
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
          <p className="eyebrow">{language === "en" ? "Great job!" : "Serie terminada"}</p>
          <h1>
            {language === "en"
              ? `You traced ${letter} ${repetitions} times!`
              : `¡Trazaste la ${letter} ${repetitions} veces!`}
          </h1>
          <div className="trace-complete-letter" aria-hidden="true">
            {letter}
          </div>
          <p>{language === "en" ? "Nice and careful. Well done!" : "Sin prisa y con mucha atención. ¡Muy buen trabajo!"}</p>
          <div className="daily-finish-actions">
            <button className="primary-button" type="button" onClick={start}>
              {language === "en" ? "Trace again" : "Repetir la serie"}
            </button>
            <button className="secondary-button" type="button" onClick={chooseAgain}>
              {language === "en" ? "Choose another letter" : "Elegir otra letra"}
            </button>
            <Link className="link-button" href={backHref}>
              {language === "en" ? "Finish" : "Terminar"}
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
          <p className="eyebrow">{language === "en" ? "No timer · take your time" : "Sin reloj · a tu ritmo"}</p>
          <h1>{language === "en" ? `Trace the letter ${letter}` : `Traza la letra ${letter}`}</h1>
          <p className="trace-series-status">
            {language === "en" ? `Trace ${current} of ${repetitions}` : `Trazo ${current} de ${repetitions}`}
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
        <p className="eyebrow">Nivel {level} · {repetitions} {language === "en" ? "traces" : "trazos"} · sin tiempo</p>
        <h1 className="page-title">{language === "en" ? "Trace letters" : "Trazar letras"}</h1>
        <p>{language === "en" ? "Choose a letter, listen to its name and trace it." : "Elige una letra. La práctica ya está lista y no hay reloj."}</p>
      </header>
      <section className="panel trace-setup-panel" aria-labelledby="trace-letter-title">
        <h2 id="trace-letter-title">1. {language === "en" ? "Choose a letter" : "Elige una letra"}</h2>
        <div className="trace-letter-grid">
          {TRACE_LETTERS.map((item) => (
            <button
              className={`trace-letter-option ${letter === item ? "selected" : ""}`}
              type="button"
              aria-pressed={letter === item}
              onClick={() => chooseLetter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="primary-button trace-start-button" type="button" onClick={start}>
          {language === "en" ? "Trace" : "Trazar"} {letter} · {normalizeTraceRepetitions(repetitions)} {language === "en" ? "times" : "veces"}
        </button>
      </section>
    </main>
  );
}
