"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { VOWEL_OPTIONS } from "@/lib/constants";
import { graphemes, targetMatches } from "@/lib/spanish";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Exercise = {
  id: string;
  wordId: string;
  configurationId: string;
  text: string;
  hiddenPositions: number[];
  type: string;
  targetKind: "VOWEL" | "CONSONANT";
  targetPosition: number | null;
  options: string[];
  imageUrl: string | null;
  audioUrl: string | null;
};
type SessionPayload = {
  sessionId: string;
  requestedCount: number;
  actualCount: number;
  exercises: Exercise[];
  message?: string;
};
type SpaceState = { value: string; errors: number };
type Summary = {
  correct: number;
  total: number;
  words: number;
  practicedLetters: string[];
  difficultLetters: string[];
  reviewWords: string[];
  targetKind: "VOWEL" | "CONSONANT";
};

const emptySummary: Summary = {
  correct: 0,
  total: 0,
  words: 0,
  practicedLetters: [],
  difficultLetters: [],
  reviewWords: [],
  targetKind: "VOWEL"
};

export default function GameSession() {
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [spaces, setSpaces] = useState<Record<number, SpaceState>>({});
  const [active, setActive] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const [audioPlays, setAudioPlays] = useState(0);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const startedAt = useRef(0);
  const exercise = data?.exercises[index];
  const targetKind =
    exercise?.targetKind ?? (exercise?.type === "SINGLE_CONSONANT" ? "CONSONANT" : "VOWEL");
  const speaker = useWordSpeaker(exercise?.id, exercise?.audioUrl);
  const { speakWord, stopSpeaking } = speaker;
  const positions = useMemo(
    () =>
      exercise
        ? targetKind === "CONSONANT" && exercise.targetPosition !== null
          ? [exercise.targetPosition]
          : exercise.hiddenPositions
        : [],
    [exercise, targetKind]
  );
  const choices = targetKind === "CONSONANT" ? (exercise?.options ?? []) : [...VOWEL_OPTIONS];
  const storageKey = useMemo(() => `yomu-session:${params.toString()}`, [params]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const restored = JSON.parse(saved);
        const timer = window.setTimeout(() => {
          setData(restored.data);
          setIndex(restored.index);
          setSummary(restored.summary);
        }, 0);
        return () => window.clearTimeout(timer);
      } catch {}
    }
    fetch("/api/game/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childProfileId: params.get("profile"),
        helpMode: params.get("mode"),
        exerciseType: params.get("type"),
        requestedCount: Number(params.get("count") || 10),
        categoryId: params.get("category") || undefined,
        difficulty: params.get("difficulty") ? Number(params.get("difficulty")) : undefined,
        requestKey: params.get("requestKey")
      })
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.message || payload.error || "No se pudo preparar el juego.");
        return payload;
      })
      .then(setData)
      .catch((error) =>
        setFeedback(error instanceof Error ? error.message : "No pudimos preparar el juego.")
      );
  }, [params, storageKey]);

  useEffect(() => {
    if (data) localStorage.setItem(storageKey, JSON.stringify({ data, index, summary }));
  }, [data, index, summary, storageKey]);
  function playAudio() {
    if (!exercise) return;
    void speakWord({ text: exercise.text, customAudioUrl: exercise.audioUrl }).catch(() => {
      setFeedback("No pudimos reproducirla, pero puedes continuar jugando.");
    });
    setAudioPlays((value) => value + 1);
  }

  function choose(letter: string) {
    if (busy || revealed || !exercise || wrongChoices.includes(letter)) return;
    if (!startedAt.current) startedAt.current = Date.now();
    const position = positions[active];
    if (position === undefined) return;
    const values = {
      ...spaces,
      [position]: { value: letter, errors: spaces[position]?.errors || 0 }
    };
    setSpaces(values);
    if (active < positions.length - 1) setActive(active + 1);
    else if (positions.length === 1) void confirm(values);
  }

  async function confirm(values = spaces) {
    if (!exercise || positions.some((position) => !values[position]?.value) || busy || revealed)
      return;
    setBusy(true);
    const wordLetters = graphemes(exercise.text);
    const incorrect = positions.filter(
      (position) => !targetMatches(wordLetters[position], values[position].value, targetKind)
    );
    if (incorrect.length) {
      const next = { ...values };
      incorrect.forEach((position) => {
        const state = values[position];
        next[position] = { value: "", errors: state.errors + 1 };
        if (targetKind === "CONSONANT")
          setWrongChoices((current) => [...new Set([...current, state.value])]);
      });
      setSpaces(next);
      setActive(Math.max(0, positions.indexOf(incorrect[0])));
      setFeedback(
        incorrect.length > 1
          ? "Mira la palabra con calma. ¡Tú puedes!"
          : `“${values[incorrect[0]].value}” no va aquí. Prueba otra.`
      );
      setBusy(false);
      return;
    }

    const answers = positions.map((position) => ({
      position,
      selectedLetter: values[position].value,
      errorCount: values[position].errors,
      correctFirstTry: values[position].errors === 0
    }));
    const firstTry = answers.filter((answer) => answer.correctFirstTry).length;
    const targetLetters = positions.map((position) => wordLetters[position]);
    const nextSummary: Summary = {
      correct: summary.correct + firstTry,
      total: summary.total + positions.length,
      words: summary.words + 1,
      practicedLetters: [...new Set([...summary.practicedLetters, ...targetLetters])],
      difficultLetters: [
        ...new Set([
          ...summary.difficultLetters,
          ...answers
            .filter((answer) => answer.errorCount > 0)
            .map((answer) => wordLetters[answer.position])
        ])
      ],
      reviewWords: [
        ...new Set([
          ...summary.reviewWords,
          ...(answers.some((answer) => answer.errorCount > 0) ? [exercise.text] : [])
        ])
      ],
      targetKind
    };
    setFeedback("¡Excelente!");
    setRevealed(true);
    setSummary(nextSummary);
    playAudio();
    await fetch(`/api/game/sessions/${data!.sessionId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configurationId: exercise.configurationId,
        answers,
        audioPlayCount: audioPlays + 1,
        responseTimeMs: Date.now() - startedAt.current
      })
    }).catch(() => {});
    window.setTimeout(async () => {
      if (index + 1 >= data!.exercises.length) {
        await fetch(`/api/game/sessions/${data!.sessionId}/complete`, { method: "POST" }).catch(
          () => {}
        );
        localStorage.removeItem(storageKey);
        sessionStorage.setItem(
          "yomu-result",
          JSON.stringify({ ...nextSummary, sessionTotal: data!.exercises.length })
        );
        router.replace("/jugar/resultado");
      } else {
        stopSpeaking();
        setSpaces({});
        setActive(0);
        setFeedback("");
        setAudioPlays(0);
        setWrongChoices([]);
        setRevealed(false);
        startedAt.current = 0;
        setIndex((value) => value + 1);
        setBusy(false);
      }
    }, 1000);
  }

  function exit() {
    if (window.confirm("¿Quieres salir del juego? Podrás volver y continuar.")) {
      speaker.stop();
      router.push("/");
    }
  }

  if (!data && !feedback)
    return (
      <main className="result">
        <div className="result-card">
          <div className="profile-avatar" style={{ margin: "auto" }}>
            よ
          </div>
          <h1>Preparando tus palabras…</h1>
        </div>
      </main>
    );
  if (!exercise)
    return (
      <main className="result">
        <div className="result-card">
          <h1>Necesitamos más palabras</h1>
          <p>
            {data?.message || feedback || "Pide a un adulto que configure ejercicios para jugar."}
          </p>
          <Link className="primary-button" href="/jugar">
            Cambiar configuración
          </Link>
        </div>
      </main>
    );

  const showImage = params.get("mode") === "WITH_IMAGE";
  return (
    <main className="game-screen">
      <div className="game-top">
        <button className="icon-button" onClick={exit} aria-label="Salir">
          ×
        </button>
        <div
          className="progress-track"
          aria-label={`Ejercicio ${index + 1} de ${data.exercises.length}`}
        >
          <div
            className="progress-fill"
            style={{ width: `${((index + 1) / data.exercises.length) * 100}%` }}
          />
        </div>
        <strong>
          {index + 1}/{data.exercises.length}
        </strong>
      </div>
      <div className="game-stage">
        <div className="media-panel">
          {showImage && exercise.imageUrl ? (
            <Image
              src={exercise.imageUrl}
              alt={`Pista para ${exercise.text}`}
              fill
              unoptimized
              sizes="(max-width: 760px) 100vw, 45vw"
            />
          ) : (
            <button className="listen-button" onClick={playAudio} aria-label="Escuchar palabra">
              🔊
            </button>
          )}
        </div>
        <section className="exercise">
          <p className="exercise-prompt">
            {targetKind === "CONSONANT"
              ? "¿Qué consonante falta?"
              : exercise.type === "INITIAL_VOWEL"
                ? "¿Con cuál vocal comienza?"
                : "Completa la palabra"}
          </p>
          {(showImage || targetKind === "CONSONANT") && (
            <button type="button" className="link-button" onClick={playAudio}>
              🔊 {speaker.isPlaying ? "Escuchando…" : "Escuchar"}
            </button>
          )}
          <label className="volume-control">
            Volumen{" "}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={speaker.volume}
              onChange={(event) => speaker.setVolume(Number(event.target.value))}
              aria-label="Volumen del audio"
            />
          </label>
          <div className="masked-word" aria-label={revealed ? exercise.text : "Palabra incompleta"}>
            {graphemes(exercise.text).map((letter, position) => {
              const hidden = positions.includes(position) && !revealed;
              const value = spaces[position]?.value;
              return hidden && !revealed ? (
                <button
                  className={`letter-slot blank ${positions[active] === position ? "active" : ""}`}
                  onClick={() => setActive(positions.indexOf(position))}
                  key={position}
                  aria-label={`Espacio ${positions.indexOf(position) + 1}`}
                >
                  {value || "_"}
                </button>
              ) : (
                <span className="letter-slot" key={position}>
                  {letter}
                </span>
              );
            })}
          </div>
          <p className="feedback" aria-live="polite">
            {feedback}
          </p>
          <div className="vowel-row">
            {choices.map((letter) => (
              <button
                className="vowel-button"
                disabled={busy || revealed || wrongChoices.includes(letter)}
                aria-label={wrongChoices.includes(letter) ? `${letter}, opción incorrecta` : letter}
                onClick={() => choose(letter)}
                key={letter}
              >
                {letter}
              </button>
            ))}
          </div>
          {positions.length > 1 && (
            <div className="confirm-row">
              <button
                className="primary-button"
                disabled={positions.some((position) => !spaces[position]?.value) || busy}
                onClick={() => void confirm()}
              >
                Comprobar
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
