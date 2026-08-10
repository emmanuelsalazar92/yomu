"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VOWEL_OPTIONS } from "@/lib/constants";
import { graphemes } from "@/lib/spanish";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Outcome = "CORRECT" | "INCORRECT" | "ASSISTED" | "SKIPPED";
type Target = {
  id: string;
  position: number;
  selectedLetter: string | null;
  expectedLetter: string | null;
  outcome: Outcome | null;
  helpUsed: boolean;
  answeredAt: string | null;
};
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
  targets: Target[];
};
type SessionPayload = {
  sessionId: string;
  requestedCount: number;
  actualCount: number;
  helpMode: "WITH_IMAGE" | "WITHOUT_IMAGE" | "LISTEN";
  feedbackDelayMs: number;
  incorrectFeedbackDelayMs: number;
  exercises: Exercise[];
  message?: string;
};
type TargetResult = {
  target: Target;
  alreadyRecorded: boolean;
  exerciseComplete: boolean;
};
type LastResult = {
  position: number;
  outcome: Outcome;
  selectedLetter: string | null;
  expectedLetter: string | null;
};

function summaryFor(data: SessionPayload) {
  const targets = data.exercises.flatMap((exercise) =>
    exercise.targets.map((target) => ({ ...target, word: exercise.text }))
  );
  const resolved = targets.filter((target) => target.outcome !== null);
  const reviewWords = [
    ...new Set(
      resolved
        .filter((target) => target.outcome !== "CORRECT")
        .map((target) => target.word)
    )
  ];
  return {
    correct: resolved.filter((target) => target.outcome === "CORRECT").length,
    incorrect: resolved.filter((target) => target.outcome === "INCORRECT").length,
    assisted: resolved.filter((target) => target.outcome === "ASSISTED").length,
    skipped: resolved.filter((target) => target.outcome === "SKIPPED").length,
    total: targets.length,
    words: data.exercises.filter((exercise) =>
      exercise.targets.every((target) => target.outcome !== null)
    ).length,
    sessionTotal: data.exercises.length,
    targetKind: data.exercises[0]?.targetKind ?? "VOWEL",
    practicedLetters: [
      ...new Set(resolved.flatMap((target) => (target.expectedLetter ? [target.expectedLetter] : [])))
    ],
    difficultLetters: [
      ...new Set(
        resolved.flatMap((target) =>
          target.outcome !== "CORRECT" && target.expectedLetter ? [target.expectedLetter] : []
        )
      )
    ],
    reviewWords,
    sessionId: data.sessionId
  };
}

function replaceTarget(data: SessionPayload, exerciseId: string, target: Target) {
  return {
    ...data,
    exercises: data.exercises.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            targets: exercise.targets.map((current) =>
              current.position === target.position ? target : current
            )
          }
        : exercise
    )
  };
}

export default function GameSession() {
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [helpImageVisible, setHelpImageVisible] = useState(false);
  const [audioPlays, setAudioPlays] = useState(0);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const busyRef = useRef(false);
  const startedAt = useRef(Date.now());
  const finishingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const exercise = data?.exercises[index];
  const speaker = useWordSpeaker(exercise?.id, exercise?.audioUrl);
  const { speakWord, stopSpeaking } = speaker;
  const activeTarget = exercise?.targets.find((target) => target.outcome === null);
  const choices =
    exercise?.targetKind === "CONSONANT" ? exercise.options : [...VOWEL_OPTIONS];
  const resumeId = params.get("resume");

  useEffect(() => {
    const request = resumeId
      ? fetch(`/api/game/sessions/${resumeId}`)
      : fetch("/api/game/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childProfileId: params.get("profile"),
            helpMode: params.get("mode"),
            exerciseType: params.get("type"),
            requestedCount: Number(params.get("count") || 10),
            categoryId: params.get("category") || undefined,
            difficulty: params.get("difficulty") ? Number(params.get("difficulty")) : undefined,
            includeLearned: params.get("includeLearned") === "true",
            requestKey: params.get("requestKey")
          })
        });
    request
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.message || payload.error || "No se pudo preparar el juego.");
        return payload as SessionPayload;
      })
      .then((payload) => {
        const pendingIndex = payload.exercises.findIndex((item) =>
          item.targets.some((target) => target.outcome === null)
        );
        setData(payload);
        setIndex(pendingIndex < 0 ? Math.max(0, payload.exercises.length - 1) : pendingIndex);
        startedAt.current = Date.now();
        if (pendingIndex < 0 && payload.exercises.length > 0) void finishSession(payload);
      })
      .catch((error) =>
        setFeedback(error instanceof Error ? error.message : "No pudimos preparar el juego.")
      );
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // The request is keyed by the URL; finishSession only handles a fully persisted resume.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, resumeId]);

  async function finishSession(finalData: SessionPayload) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      const response = await fetch(`/api/game/sessions/${finalData.sessionId}/complete`, {
        method: "POST"
      });
      const persisted = await response.json();
      if (!response.ok) throw new Error(persisted.error || "No se pudo finalizar la sesión.");
      sessionStorage.setItem(
        "yomu-result",
        JSON.stringify({ ...summaryFor(finalData), ...persisted })
      );
      router.replace("/jugar/resultado");
    } catch (error) {
      finishingRef.current = false;
      setFeedback(error instanceof Error ? error.message : "No se pudo finalizar la sesión.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  function playAudio() {
    if (!exercise) return;
    void speakWord({ text: exercise.text, customAudioUrl: exercise.audioUrl }).catch(() => {
      setFeedback("No pudimos reproducirla, pero puedes continuar jugando.");
    });
    setAudioPlays((value) => value + 1);
  }

  function unlockForNextTarget() {
    setLastResult(null);
    setFeedback("");
    setAudioPlays(0);
    startedAt.current = Date.now();
    busyRef.current = false;
    setBusy(false);
  }

  function advanceAfterResult(nextData: SessionPayload, result: TargetResult) {
    if (!exercise || !result.target.outcome) return;
    const outcome = result.target.outcome;
    setLastResult({
      position: result.target.position,
      outcome,
      selectedLetter: result.target.selectedLetter,
      expectedLetter: result.target.expectedLetter
    });
    if (outcome === "CORRECT") setFeedback("¡Muy bien!");
    if (outcome === "INCORRECT") {
      setFeedback(
        `Escucha: ${exercise.text}. La letra que falta es ${result.target.expectedLetter ?? "esta"}.`
      );
      void speakWord({ text: exercise.text, customAudioUrl: exercise.audioUrl }).catch(() => {});
    }
    if (outcome === "ASSISTED")
      setFeedback(`Con ayuda: la letra es ${result.target.expectedLetter ?? "esta"}.`);
    if (outcome === "SKIPPED")
      setFeedback(`La omitimos por ahora. La letra es ${result.target.expectedLetter ?? "esta"}.`);

    const delay =
      outcome === "CORRECT" ? nextData.feedbackDelayMs : nextData.incorrectFeedbackDelayMs;
    timerRef.current = window.setTimeout(() => {
      const updatedExercise = nextData.exercises[index];
      const hasPending = updatedExercise?.targets.some((target) => target.outcome === null);
      if (hasPending) {
        unlockForNextTarget();
        return;
      }
      if (index + 1 < nextData.exercises.length) {
        stopSpeaking();
        setIndex((value) => value + 1);
        setHelpImageVisible(false);
        unlockForNextTarget();
      } else {
        void finishSession(nextData);
      }
    }, delay);
  }

  async function postTarget(path: "answers" | "help" | "skip", body: object) {
    if (!data || !exercise) throw new Error("Sesión no disponible");
    const response = await fetch(`/api/game/sessions/${data.sessionId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionExerciseId: exercise.id,
        position: activeTarget?.position,
        responseTimeMs: Math.max(0, Date.now() - startedAt.current),
        audioPlayCount: audioPlays,
        ...body
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo guardar la respuesta.");
    return payload as TargetResult;
  }

  async function choose(letter: string) {
    if (!data || !exercise || !activeTarget || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await postTarget("answers", { selectedLetter: letter });
      const nextData = replaceTarget(data, exercise.id, result.target);
      setData(nextData);
      advanceAfterResult(nextData, result);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la respuesta.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function requestHelp() {
    if (!data || !exercise || !activeTarget || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const canGiveClue = Boolean(exercise.imageUrl || exercise.audioUrl || speaker.isSpeechAvailable());
    if (exercise.imageUrl) setHelpImageVisible(true);
    if (exercise.audioUrl || speaker.isSpeechAvailable()) playAudio();
    try {
      const result = await postTarget("help", {
        reveal: !canGiveClue,
        audioPlayCount: audioPlays + (exercise.audioUrl || speaker.isSpeechAvailable() ? 1 : 0)
      });
      const nextData = replaceTarget(data, exercise.id, result.target);
      setData(nextData);
      if (result.target.outcome) advanceAfterResult(nextData, result);
      else {
        setFeedback("Pista usada. Ahora elige una sola respuesta.");
        busyRef.current = false;
        setBusy(false);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo mostrar la ayuda.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function skipTarget() {
    if (!data || !exercise || !activeTarget || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await postTarget("skip", {});
      const nextData = replaceTarget(data, exercise.id, result.target);
      setData(nextData);
      advanceAfterResult(nextData, result);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo omitir la respuesta.");
      busyRef.current = false;
      setBusy(false);
    }
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
          <div className="profile-avatar" style={{ margin: "auto" }}>よ</div>
          <h1>Preparando tus palabras…</h1>
        </div>
      </main>
    );
  if (!exercise)
    return (
      <main className="result">
        <div className="result-card">
          <h1>Necesitamos más palabras</h1>
          <p>{data?.message || feedback || "Pide a un adulto que configure ejercicios para jugar."}</p>
          <Link className="primary-button" href="/jugar">Cambiar configuración</Link>
        </div>
      </main>
    );

  const showImage = data.helpMode === "WITH_IMAGE" || helpImageVisible;
  return (
    <main className="game-screen">
      <div className="game-top">
        <button className="icon-button" onClick={exit} aria-label="Salir">×</button>
        <div className="progress-track" aria-label={`Ejercicio ${index + 1} de ${data.exercises.length}`}>
          <div className="progress-fill" style={{ width: `${((index + 1) / data.exercises.length) * 100}%` }} />
        </div>
        <strong>{index + 1}/{data.exercises.length}</strong>
      </div>
      <div className="game-stage">
        <div className="media-panel">
          {showImage && exercise.imageUrl ? (
            <Image src={exercise.imageUrl} alt={`Pista para ${exercise.text}`} fill unoptimized sizes="(max-width: 760px) 100vw, 45vw" />
          ) : (
            <button className="listen-button" onClick={playAudio} aria-label="Escuchar palabra">🔊</button>
          )}
        </div>
        <section className="exercise">
          <p className="exercise-prompt">
            {exercise.targetKind === "CONSONANT" ? "¿Qué consonante falta?" : exercise.type === "INITIAL_VOWEL" ? "¿Con cuál vocal comienza?" : "Completa la palabra"}
          </p>
          {(showImage || exercise.targetKind === "CONSONANT") && (
            <button type="button" className="link-button" onClick={playAudio}>🔊 {speaker.isPlaying ? "Escuchando…" : "Escuchar"}</button>
          )}
          <label className="volume-control">
            Volumen <input type="range" min="0" max="1" step="0.1" value={speaker.volume} onChange={(event) => speaker.setVolume(Number(event.target.value))} aria-label="Volumen del audio" />
          </label>
          <div className="masked-word" aria-label="Palabra del ejercicio">
            {graphemes(exercise.text).map((letter, position) => {
              const target = exercise.targets.find((item) => item.position === position);
              if (!target) return <span className="letter-slot" key={position}>{letter}</span>;
              return (
                <span className={`letter-slot blank ${activeTarget?.position === position ? "active" : ""} ${target.outcome ? "resolved" : ""}`} key={position} aria-label={`Espacio ${exercise.targets.indexOf(target) + 1}`}>
                  {target.outcome ? target.expectedLetter : "_"}
                </span>
              );
            })}
          </div>
          <p className="feedback" aria-live="polite">{feedback}</p>
          <div className="vowel-row">
            {choices.map((letter) => {
              const correct = lastResult?.expectedLetter === letter;
              const wrong = lastResult?.selectedLetter === letter && lastResult.outcome === "INCORRECT";
              return (
                <button className={`vowel-button ${correct ? "correct-option" : ""} ${wrong ? "wrong-option" : ""}`} disabled={busy || !activeTarget} aria-label={letter} onClick={() => void choose(letter)} key={letter}>{letter}</button>
              );
            })}
          </div>
          <div className="game-assistance-row">
            <button type="button" className="secondary-button help-button" disabled={busy || !activeTarget} onClick={() => void requestHelp()}>💡 Ayuda</button>
            <button type="button" className="link-button skip-button" disabled={busy || !activeTarget} onClick={() => void skipTarget()}>Omitir</button>
          </div>
        </section>
      </div>
    </main>
  );
}
