"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWordSpeaker } from "@/lib/use-word-speaker";
import TraceCanvas from "./trace-canvas";

type Outcome = "CORRECT" | "INCORRECT" | "ASSISTED" | "SKIPPED";
type DailyTarget = {
  id: string;
  position: number;
  expectedPiece: string | null;
  selectedPiece: string | null;
  outcome: Outcome | null;
  helpUsed: boolean;
  answeredAt: string | null;
};
type DailyActivity = {
  id: string;
  type: "INITIAL_SOUND" | "SYLLABLE_BUILD" | "TRACE_LETTER";
  position: number;
  wordText: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  options: string[];
  outcome: Outcome | null;
  targets: DailyTarget[];
};
type JourneyPayload = {
  journeyId: string;
  dateKey: string;
  durationMinutes: number;
  status: "ACTIVE" | "COMPLETED";
  child: { id: string; nickname: string; avatar: string | null };
  reward: { name: string; icon: string; stage: number } | null;
  activities: DailyActivity[];
  summary: {
    correct: number;
    incorrect: number;
    assisted: number;
    skipped: number;
    total: number;
    strengths: string[];
    practice: string[];
    recommendation: string;
  };
};
type AnswerResponse = {
  target: DailyTarget;
  alreadyRecorded: boolean;
  activityComplete: boolean;
  activityOutcome: Outcome | null;
};

const activityNames = {
  INITIAL_SOUND: "Sonido inicial",
  SYLLABLE_BUILD: "Construir palabra",
  TRACE_LETTER: "Trazar letra"
};

function replaceTarget(
  data: JourneyPayload,
  activityId: string,
  target: DailyTarget,
  activityOutcome: Outcome | null
) {
  return {
    ...data,
    activities: data.activities.map((activity) =>
      activity.id === activityId
        ? {
            ...activity,
            outcome: activityOutcome,
            targets: activity.targets.map((current) =>
              current.position === target.position ? target : current
            )
          }
        : activity
    )
  };
}

export default function DailyRoute() {
  const params = useSearchParams();
  const router = useRouter();
  const profileId = params.get("perfil");
  const requestedMinutes = Number(params.get("minutos"));
  const durationMinutes = [5, 10, 15].includes(requestedMinutes) ? requestedMinutes : 5;
  const [data, setData] = useState<JourneyPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTarget, setLastTarget] = useState<DailyTarget | null>(null);
  const busyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const activity = data?.activities[index];
  const activeTarget = activity?.targets.find((target) => target.outcome === null);
  const displayedTarget = activeTarget ?? lastTarget;
  const speaker = useWordSpeaker(activity?.id, activity?.audioUrl);

  useEffect(() => {
    if (!profileId) {
      return;
    }
    fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childProfileId: profileId, durationMinutes })
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo preparar la aventura.");
        return payload as JourneyPayload;
      })
      .then((payload) => {
        setData(payload);
        const pending = payload.activities.findIndex((item) =>
          item.targets.some((target) => target.outcome === null)
        );
        setIndex(pending < 0 ? payload.activities.length - 1 : pending);
      })
      .catch((error) =>
        setFeedback(error instanceof Error ? error.message : "No se pudo preparar la aventura.")
      );
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [durationMinutes, profileId]);

  function playWord() {
    if (!activity?.wordText) return;
    void speaker
      .speakWord({ text: activity.wordText, customAudioUrl: activity.audioUrl })
      .catch(() => setFeedback("No pudimos reproducirla, pero puedes continuar."));
  }

  async function sendAnswer(
    action: "ANSWER" | "HELP" | "SKIP" | "TRACE",
    extra: { selectedPiece?: string; tracePoints?: number } = {}
  ) {
    if (!data || !activity || !activeTarget || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await fetch(`/api/daily/${data.journeyId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          position: activeTarget.position,
          action,
          responseTimeMs: 0,
          ...extra
        })
      });
      const result = (await response.json()) as AnswerResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la respuesta.");
      const nextData = replaceTarget(data, activity.id, result.target, result.activityOutcome);
      setData(nextData);
      setLastTarget(result.target);
      const outcome = result.target.outcome;
      if (outcome === "CORRECT")
        setFeedback(action === "TRACE" ? "¡Qué buen trazo!" : "¡Muy bien!");
      if (outcome === "INCORRECT")
        setFeedback(`Esta vez era ${result.target.expectedPiece}. Escúchala y recuérdala.`);
      if (outcome === "ASSISTED") setFeedback(`Te ayudo: aquí va ${result.target.expectedPiece}.`);
      if (outcome === "SKIPPED")
        setFeedback(`La guardamos para practicar: era ${result.target.expectedPiece}.`);
      if (result.target.expectedPiece && activity.type !== "TRACE_LETTER") {
        void speaker
          .speakWord({ text: result.target.expectedPiece, customAudioUrl: null })
          .catch(() => {});
      }
      timerRef.current = window.setTimeout(
        () => void continueJourney(nextData, result.activityComplete),
        outcome === "CORRECT" ? 900 : 1900
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar la respuesta.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function continueJourney(nextData: JourneyPayload, activityComplete: boolean) {
    if (!activityComplete) {
      setFeedback("");
      setLastTarget(null);
      busyRef.current = false;
      setBusy(false);
      return;
    }
    if (activity?.wordText) {
      void speaker
        .speakWord({ text: activity.wordText, customAudioUrl: activity.audioUrl })
        .catch(() => {});
    }
    if (index + 1 < nextData.activities.length) {
      setIndex((value) => value + 1);
      setFeedback("");
      setLastTarget(null);
      busyRef.current = false;
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/daily/${nextData.journeyId}/complete`, {
        method: "POST"
      });
      const completed = await response.json();
      if (!response.ok) throw new Error(completed.error || "No se pudo terminar la ruta.");
      setData(completed);
      setBusy(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo terminar la ruta.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  function exit() {
    if (window.confirm("¿Quieres salir? Tu avance de hoy queda guardado.")) {
      speaker.stop();
      router.push(profileId ? `/jugar?perfil=${profileId}` : "/");
    }
  }

  if (!data)
    return (
      <main className="result">
        <section className="result-card">
          <div className="profile-avatar" style={{ margin: "auto" }}>
            🗺️
          </div>
          <h1>
            {feedback ||
              (!profileId
                ? "Selecciona un perfil para comenzar."
                : "Preparando tu aventura de hoy…")}
          </h1>
          {feedback && (
            <Link className="primary-button" href="/">
              Volver
            </Link>
          )}
        </section>
      </main>
    );

  if (data.status === "COMPLETED") {
    return (
      <main className="result daily-celebration">
        <section className="result-card">
          <div className="reward-icon">{data.reward?.icon ?? "🌟"}</div>
          <p className="eyebrow">Aventura de {data.durationMinutes} minutos terminada</p>
          <h1>¡Tu jardín sigue creciendo, {data.child.nickname}!</h1>
          <h2>{data.reward?.name}</h2>
          <div
            className="garden-progress"
            aria-label={`Recompensa ${data.reward?.stage ?? 1} de 5`}
          >
            {["🌰", "🌱", "🌿", "🌼", "🌳"].map((icon, stage) => (
              <span className={stage < (data.reward?.stage ?? 1) ? "earned" : ""} key={icon}>
                {icon}
              </span>
            ))}
          </div>
          <p>Hoy completaste {data.activities.length} juegos cortos.</p>
          <div className="stat-grid result-breakdown">
            <div className="stat">
              <strong>{data.summary.correct}</strong> sin ayuda
            </div>
            <div className="stat">
              <strong>
                {data.summary.incorrect + data.summary.assisted + data.summary.skipped}
              </strong>{" "}
              para practicar
            </div>
          </div>
          <details className="adult-summary">
            <summary>Para el adulto</summary>
            <p>
              <strong>Fortalezas:</strong>{" "}
              {data.summary.strengths.join(", ") || "completar la ruta"}
            </p>
            <p>
              <strong>Para reforzar:</strong>{" "}
              {data.summary.practice.join(", ") || "ningún objetivo específico"}
            </p>
            <p>{data.summary.recommendation}</p>
          </details>
          <div className="daily-finish-actions">
            <Link className="primary-button" href="/">
              Terminar
            </Link>
            <Link className="secondary-button" href={`/jugar?perfil=${data.child.id}`}>
              Practicar más
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!activity || !displayedTarget) return null;
  const revealWord = activity.targets.every((target) => target.outcome !== null);
  return (
    <main className="game-screen daily-route-screen">
      <div className="game-top">
        <button className="icon-button" onClick={exit} aria-label="Salir">
          ×
        </button>
        <div
          className="progress-track"
          aria-label={`Actividad ${index + 1} de ${data.activities.length}`}
        >
          <div
            className="progress-fill"
            style={{ width: `${((index + 1) / data.activities.length) * 100}%` }}
          />
        </div>
        <strong>
          {index + 1}/{data.activities.length}
        </strong>
      </div>
      <div className={`daily-activity ${activity.type === "TRACE_LETTER" ? "trace-activity" : ""}`}>
        <p className="eyebrow">{activityNames[activity.type]}</p>
        {activity.type === "INITIAL_SOUND" && <h1>¿Con qué sonido comienza?</h1>}
        {activity.type === "SYLLABLE_BUILD" && <h1>Construye la palabra por partes</h1>}
        {activity.type === "TRACE_LETTER" && (
          <h1>Traza la letra {displayedTarget.expectedPiece}</h1>
        )}

        {activity.type !== "TRACE_LETTER" && (
          <div className="daily-media">
            {activity.imageUrl ? (
              <Image
                src={activity.imageUrl}
                alt="Pista visual de la palabra"
                fill
                unoptimized
                sizes="320px"
              />
            ) : (
              <button className="listen-button" aria-label="Escuchar palabra" onClick={playWord}>
                🔊
              </button>
            )}
          </div>
        )}
        {activity.type !== "TRACE_LETTER" && (
          <button type="button" className="link-button daily-listen" onClick={playWord}>
            🔊 {speaker.isPlaying ? "Escuchando…" : "Escuchar palabra"}
          </button>
        )}

        {activity.type === "SYLLABLE_BUILD" && (
          <div className="syllable-slots" aria-label="Sílabas de la palabra">
            {activity.targets.map((target) => (
              <span
                className={`syllable-slot ${target.outcome ? "resolved" : ""} ${activeTarget?.position === target.position ? "active" : ""}`}
                key={target.id}
              >
                {target.outcome ? target.expectedPiece : "_"}
              </span>
            ))}
          </div>
        )}
        {revealWord && activity.wordText && (
          <div className="daily-revealed-word">{activity.wordText}</div>
        )}

        {activity.type === "TRACE_LETTER" ? (
          <TraceCanvas
            letter={displayedTarget.expectedPiece ?? ""}
            disabled={busy}
            onComplete={(points) => void sendAnswer("TRACE", { tracePoints: points })}
          />
        ) : (
          <div className="daily-options">
            {activity.options.map((option) => {
              const isCorrect = lastTarget?.expectedPiece === option;
              const isWrong =
                lastTarget?.selectedPiece === option && lastTarget.outcome === "INCORRECT";
              return (
                <button
                  className={`daily-option ${isCorrect ? "correct-option" : ""} ${isWrong ? "wrong-option" : ""}`}
                  disabled={busy}
                  onClick={() => void sendAnswer("ANSWER", { selectedPiece: option })}
                  key={option}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}
        <p className="feedback" aria-live="polite">
          {feedback}
        </p>
        {activity.type !== "TRACE_LETTER" && (
          <div className="game-assistance-row">
            <button
              className="secondary-button help-button"
              disabled={busy}
              onClick={() => void sendAnswer("HELP")}
            >
              💡 Ayuda
            </button>
            <button
              className="link-button skip-button"
              disabled={busy}
              onClick={() => void sendAnswer("SKIP")}
            >
              Omitir
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
