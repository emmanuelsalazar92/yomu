"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Volume2 } from "lucide-react";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Exercise = {
  id: string;
  wordId: string;
  configurationId: string;
  text: string;
  hiddenPositions: number[];
  type: string;
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

const vowels = ["A", "E", "I", "O", "U"];
const letters = (word: string) => Array.from(word);
const base = (letter: string) =>
  (({ Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U" }) as Record<string, string>)[letter] ||
  letter;

export default function GameSession() {
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [spaces, setSpaces] = useState<Record<number, SpaceState>>({});
  const [active, setActive] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioPlays, setAudioPlays] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState({ correct: 0, total: 0, words: 0 });
  const startedAt = useRef(0);
  const exercise = data?.exercises[index];
  const {
    state: playbackState,
    speakWord,
    stopSpeaking
  } = useWordSpeaker(exercise?.id, exercise?.audioUrl);
  const positions = exercise?.hiddenPositions || [];
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
  function choose(vowel: string) {
    if (busy || !exercise) return;
    if (!startedAt.current) startedAt.current = new Date().getTime();
    const position = positions[active];
    if (position === undefined) return;
    setSpaces((current) => ({
      ...current,
      [position]: { value: vowel, errors: current[position]?.errors || 0 }
    }));
    if (active < positions.length - 1) setActive(active + 1);
    else if (positions.length === 1)
      void confirm({
        ...spaces,
        [position]: { value: vowel, errors: spaces[position]?.errors || 0 }
      });
  }
  async function confirm(values = spaces) {
    if (!exercise || positions.some((position) => !values[position]) || busy) return;
    setBusy(true);
    let correct = 0;
    let errors = 0;
    const wordLetters = letters(exercise.text);
    const answers = positions.map((position) => {
      const state = values[position];
      const matches = base(wordLetters[position]) === state.value;
      if (matches && state.errors === 0) correct++;
      if (!matches) {
        errors++;
        state.errors++;
      }
      return {
        position,
        selectedVowel: state.value,
        errorCount: state.errors,
        correctFirstTry: matches && state.errors === 0
      };
    });
    if (errors) {
      setSpaces({ ...values });
      setFeedback(
        errors >= 2
          ? "Mira la palabra con calma. ¡Tú puedes!"
          : "Casi. Probemos esa vocal otra vez."
      );
      setActive(
        Math.max(
          0,
          positions.findIndex((position) => base(wordLetters[position]) !== values[position]?.value)
        )
      );
      setBusy(false);
      return;
    }
    setFeedback("¡Excelente!");
    setRevealed(true);
    playAudio();
    const nextSummary = {
      correct: summary.correct + correct,
      total: summary.total + positions.length,
      words: summary.words + 1
    };
    setSummary(nextSummary);
    await fetch(`/api/game/sessions/${data.sessionId}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configurationId: exercise.configurationId,
        answers,
        audioPlayCount: audioPlays,
        responseTimeMs: new Date().getTime() - startedAt.current
      })
    }).catch(() => {});
    window.setTimeout(async () => {
      if (index + 1 >= data.exercises.length) {
        await fetch(`/api/game/sessions/${data.sessionId}/complete`, { method: "POST" }).catch(
          () => {}
        );
        localStorage.removeItem(storageKey);
        sessionStorage.setItem(
          "yomu-result",
          JSON.stringify({ ...nextSummary, sessionTotal: data.exercises.length })
        );
        router.replace("/jugar/resultado");
      } else {
        stopSpeaking();
        setSpaces({});
        setActive(0);
        setFeedback("");
        setAudioPlays(0);
        setRevealed(false);
        startedAt.current = 0;
        setIndex((value) => value + 1);
        setBusy(false);
      }
    }, 800);
  }
  function exit() {
    stopSpeaking();
    if (window.confirm("¿Quieres salir del juego? Podrás volver y continuar.")) router.push("/");
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
            <div className="media-placeholder" aria-hidden="true">
              {showImage ? "🌱" : "✨"}
            </div>
          )}
          <button
            className={`listen-button speaker-control ${playbackState === "playing" ? "is-playing" : ""}`}
            onClick={playAudio}
            aria-label="Escuchar palabra"
            aria-live="polite"
          >
            <Volume2 aria-hidden="true" />
            <span>{playbackState === "playing" ? "Reproduciendo" : "Escuchar"}</span>
          </button>
        </div>
        <section className="exercise">
          <p className="exercise-prompt">
            {exercise.type === "INITIAL_VOWEL"
              ? "¿Con cuál vocal comienza?"
              : "Completa la palabra"}
          </p>
          <div className="masked-word" aria-label="Palabra incompleta">
            {letters(exercise.text).map((letter, position) => {
              const hidden = positions.includes(position);
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
            {vowels.map((vowel) => (
              <button
                className="vowel-button"
                disabled={busy}
                onClick={() => choose(vowel)}
                key={vowel}
              >
                {vowel}
              </button>
            ))}
          </div>
          {positions.length > 1 && (
            <div className="confirm-row">
              <button
                className="primary-button"
                disabled={positions.some((position) => !spaces[position]) || busy}
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
