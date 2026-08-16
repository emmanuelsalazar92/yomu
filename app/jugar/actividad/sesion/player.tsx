"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { activityById, activityHref } from "@/lib/activity-catalog";
import { createClientUuid } from "@/lib/client-uuid";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Outcome = "CORRECT" | "INCORRECT" | "ASSISTED" | "SKIPPED";
type ActivityType =
  | "CASE_MATCH"
  | "NAME_TILES"
  | "SYLLABLE_COUNT"
  | "INITIAL_SOUND"
  | "SYLLABLE_BUILD"
  | "ENGLISH_CASE_MATCH"
  | "ENGLISH_VOCABULARY"
  | "ENGLISH_INITIAL_SOUND"
  | "ENGLISH_CVC_BUILD"
  | "ENGLISH_SIGHT_WORD"
  | "MATH_NUMBER_QUANTITY"
  | "MATH_COUNT_OBJECTS"
  | "MATH_COMPARE_QUANTITIES"
  | "MATH_NUMBER_SEQUENCE"
  | "MATH_ADDITION"
  | "MATH_SUBTRACTION"
  | "MATH_PLACE_VALUE"
  | "MATH_COMPARE_TWO_DIGIT"
  | "MATH_ADDITION_TWO_DIGIT"
  | "MATH_SUBTRACTION_TWO_DIGIT"
  | "MATH_STORY_ADDITION"
  | "MATH_STORY_SUBTRACTION"
  | "LOGIC_SHAPE"
  | "LOGIC_SORT"
  | "LOGIC_PATTERN"
  | "LOGIC_POSITION"
  | "LOGIC_MEASURE"
  | "STORY_CHARACTER"
  | "STORY_SETTING"
  | "STORY_SEQUENCE"
  | "STORY_COMPREHENSION"
  | "STORY_VOCABULARY";
type Tile = {
  id: string;
  value: string;
  emoji?: string;
  count?: number;
  label?: string;
  color?: string;
  shape?: string;
};
type Prompt = {
  letter?: string;
  direction?: string;
  promptLetter?: string;
  spokenPrompt?: string;
  mode?: string;
  showModel?: boolean;
  model?: string | null;
  slotCount?: number;
  fixed?: Array<{ index: number; value: string }>;
  tiles?: Tile[];
  speechText?: string;
  hasCustomAudio?: boolean;
  emoji?: string;
  language?: string;
  number?: number;
  count?: number;
  left?: number;
  right?: number;
  operator?: string;
  values?: Array<number | string>;
  missingIndex?: number;
  answer?: number;
  tens?: number;
  ones?: number;
  label?: string;
  question?: string;
  position?: string;
  title?: string;
  story?: string;
  scenes?: string[];
  word?: string;
  leftLabel?: string;
  rightLabel?: string;
};
type Reveal =
  | {
      tileIds?: string[];
      name?: string;
      graphemes?: string[];
      count?: number;
      syllables?: string[];
      letters?: string[];
      word?: string;
      emoji?: string;
      answer?: number;
      equation?: string;
    }
  | string
  | null;
type Item = {
  id: string;
  position: number;
  targetKey: string;
  prompt: Prompt;
  options: Array<string | number | Tile>;
  outcome: Outcome | null;
  helpUsed: boolean;
  firstResponse:
    | string
    | string[]
    | { tileIds: string[]; correctPositions: number[]; incorrectPositions: number[] }
    | null;
  reveal: Reveal;
  hint: Reveal;
  media: { imageUrl: string | null; audioUrl: string | null } | null;
};
type Session = {
  id: string;
  activityType: ActivityType;
  mode: string;
  requestedCount: number;
  actualCount: number;
  status: "ACTIVE" | "COMPLETED";
  score: number | null;
  childProfile: { id: string; nickname: string; avatar: string | null };
  items: Item[];
};

const audioActivityTypes: ActivityType[] = [
  "SYLLABLE_COUNT",
  "INITIAL_SOUND",
  "SYLLABLE_BUILD",
  "ENGLISH_VOCABULARY",
  "ENGLISH_INITIAL_SOUND",
  "ENGLISH_CVC_BUILD",
  "ENGLISH_SIGHT_WORD",
  "STORY_CHARACTER",
  "STORY_SETTING",
  "STORY_SEQUENCE",
  "STORY_COMPREHENSION",
  "STORY_VOCABULARY",
  "MATH_STORY_ADDITION",
  "MATH_STORY_SUBTRACTION"
];

const feedbackText: Record<Outcome, string> = {
  CORRECT: "¡Muy bien!",
  ASSISTED: "¡Lo lograste con una pista!",
  INCORRECT: "Buen intento. Mira la respuesta.",
  SKIPPED: "Lo dejamos para el repaso."
};

function timeNow() {
  return Date.now();
}

function revealObject(value: Reveal) {
  return value && typeof value === "object" ? value : {};
}

export default function ActivityPlayer() {
  const params = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [selectedPieces, setSelectedPieces] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const startedAt = useRef(0);
  const busyRef = useRef(false);
  const item = data?.items[index];
  const speaker = useWordSpeaker(item?.id, item?.media?.audioUrl);
  const englishActivity = Boolean(
    data?.activityType.startsWith("ENGLISH") || params.get("type")?.startsWith("ENGLISH")
  );
  const mathActivity = Boolean(
    data?.activityType.startsWith("MATH") || params.get("type")?.startsWith("MATH")
  );
  const logicActivity = Boolean(
    data?.activityType.startsWith("LOGIC") || params.get("type")?.startsWith("LOGIC")
  );
  const storyActivity = Boolean(
    data?.activityType.startsWith("STORY") || params.get("type")?.startsWith("STORY")
  );
  const speechLanguage = englishActivity ? "en-US" : "es-CR";
  const menuHref = (profileId: string) =>
    `/jugar?perfil=${profileId}${englishActivity ? "&idioma=en" : mathActivity ? "&materia=matematicas" : logicActivity ? "&materia=logica" : storyActivity ? "&materia=cuentos" : ""}`;

  useEffect(() => {
    const resume = params.get("resume");
    const request = resume
      ? fetch(`/api/activities/sessions/${resume}`)
      : fetch("/api/activities/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childProfileId: params.get("profile"),
            activityType: params.get("type"),
            mode: params.get("mode"),
            requestedCount: Number(params.get("count") || 5),
            requestKey: params.get("requestKey"),
            categoryId: params.get("category") || undefined,
            difficulty: params.get("difficulty") ? Number(params.get("difficulty")) : undefined
          })
        });
    request
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo preparar la actividad.");
        return payload as Session;
      })
      .then((session) => {
        const pending = session.items.findIndex((current) => current.outcome === null);
        setData(session);
        setIndex(pending < 0 ? Math.max(0, session.items.length - 1) : pending);
        setShowResults(pending < 0);
        startedAt.current = timeNow();
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "No se pudo preparar la actividad.")
      );
  }, [params]);

  useEffect(() => {
    if (data && audioActivityTypes.includes(data.activityType) && item && !item.outcome) {
      void speaker
        .play(item.prompt.speechText || "", item.media?.audioUrl, speechLanguage)
        .catch(() => setAudioError(true));
    }
    // The active item owns playback; the speaker is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, data?.activityType, speechLanguage]);

  async function playCurrentWord(current: Item) {
    await speaker.play(current.prompt.speechText || "", current.media?.audioUrl, speechLanguage);
  }

  async function act(
    action: "ANSWER" | "HELP" | "SKIP",
    response?: string | string[],
    technicalReason?: string
  ) {
    if (!data || !item || busyRef.current || item.outcome) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await fetch(`/api/activities/sessions/${data.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          action,
          response,
          responseTimeMs: timeNow() - startedAt.current,
          technicalReason
        })
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || "No se pudo guardar.");
      setData(payload);
      const current = payload.items[index] as Item;
      if (["CASE_MATCH", "ENGLISH_CASE_MATCH"].includes(payload.activityType)) {
        await speaker.play(
          current.prompt.spokenPrompt || current.prompt.promptLetter || "",
          null,
          speechLanguage
        );
      }
      if (payload.activityType === "NAME_TILES" && action !== "HELP") {
        const currentReveal = revealObject(current.reveal);
        await speaker.play(`Este es tu nombre: ${currentReveal.name || ""}`);
      }
      if (audioActivityTypes.includes(payload.activityType)) await playCurrentWord(current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function next() {
    if (!data) return;
    const pending = data.items.findIndex(
      (current, position) => position > index && current.outcome === null
    );
    if (pending >= 0) {
      setSelectedTiles([]);
      setSelectedPieces([]);
      setAudioError(false);
      startedAt.current = timeNow();
      setIndex(pending);
    } else setShowResults(true);
  }

  async function review() {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/activities/sessions/${data.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey: createClientUuid() })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No hay elementos para repasar.");
      setData(payload);
      setIndex(0);
      setShowResults(false);
      setSelectedTiles([]);
      setSelectedPieces([]);
      setAudioError(false);
      startedAt.current = timeNow();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo crear el repaso.");
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(
    () =>
      data
        ? {
            correct: data.items.filter((current) => current.outcome === "CORRECT").length,
            assisted: data.items.filter((current) => current.outcome === "ASSISTED").length,
            review: data.items.filter(
              (current) => current.outcome === "INCORRECT" || current.outcome === "SKIPPED"
            ).length
          }
        : null,
    [data]
  );

  function startAnotherSession() {
    if (!data) return;
    const activity = activityById(data.activityType);
    if (!activity) return router.push(menuHref(data.childProfile.id));
    router.push(activityHref(activity, data.childProfile.id, createClientUuid()));
  }

  if (error && !data) {
    const profileId = params.get("profile");
    return (
      <main className="game-shell">
        <section className="panel activity-error">
          <h1>No pudimos iniciar</h1>
          <p className="error-text">{error}</p>
          <Link className="secondary-button" href={profileId ? menuHref(profileId) : "/"}>
            Volver
          </Link>
        </section>
      </main>
    );
  }
  if (!data || !item || !summary)
    return (
      <main className="game-shell">
        <p>Preparando actividad…</p>
      </main>
    );
  if (showResults)
    return (
      <main className="game-shell">
        <section className="result-card activity-result">
          <span className="result-emoji">🌟</span>
          <p className="eyebrow">{englishActivity ? "Practice complete" : "Actividad terminada"}</p>
          <h1>
            {englishActivity
              ? `Great job, ${data.childProfile.nickname}!`
              : `¡Gran práctica, ${data.childProfile.nickname}!`}
          </h1>
          <div className="activity-result-grid">
            <div>
              <strong>{summary.correct}</strong>
              <span>sin ayuda</span>
            </div>
            <div>
              <strong>{summary.assisted}</strong>
              <span>con pista</span>
            </div>
            <div>
              <strong>{summary.review}</strong>
              <span>para repasar</span>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="button-row">
            {summary.review > 0 && (
              <button className="primary-button" disabled={busy} onClick={() => void review()}>
                Repasar ahora
              </button>
            )}
            <button className="secondary-button" type="button" onClick={startAnotherSession}>
              Otra sesión
            </button>
            <Link className="secondary-button" href={menuHref(data.childProfile.id)}>
              Elegir actividad
            </Link>
          </div>
        </section>
      </main>
    );

  const reveal = revealObject(item.reveal);
  const hint = revealObject(item.hint);
  const nameTiles = (item.prompt.tiles || []) as Tile[];
  const optionTiles = item.options as Tile[];
  const selectedSet = new Set(selectedTiles);
  const fixed = new Map((item.prompt.fixed || []).map((entry) => [entry.index, entry.value]));
  let movableCursor = 0;
  const nameSlots = Array.from(
    { length: item.prompt.slotCount || nameTiles.length },
    (_, position) => {
      if (fixed.has(position)) return { fixed: true, value: fixed.get(position) || " " };
      const tileId = selectedTiles[movableCursor++];
      return {
        fixed: false,
        value: nameTiles.find((tile) => tile.id === tileId)?.value || "",
        tileId
      };
    }
  );
  const chosenValues = selectedPieces.map((optionIndex) => optionTiles[optionIndex]?.value || "");

  return (
    <main className="game-shell activity-player">
      <header className="game-header">
        <Link className="brand" href={menuHref(data.childProfile.id)}>
          <span className="brand-mark">よ</span> Yomu
        </Link>
        <span>
          {data.childProfile.avatar || "🌱"} {data.childProfile.nickname}
        </span>
      </header>
      <div className="progress-track" aria-label={`Reto ${index + 1} de ${data.actualCount}`}>
        <span
          className="progress-fill"
          style={{ width: `${((index + (item.outcome ? 1 : 0)) / data.actualCount) * 100}%` }}
        />
      </div>
      <section className="activity-stage panel">
        <p className="eyebrow">
          {englishActivity ? "Challenge" : "Reto"} {index + 1} de {data.actualCount}
        </p>

        {(data.activityType === "CASE_MATCH" || data.activityType === "ENGLISH_CASE_MATCH") && (
          <>
            <h1 className="case-prompt">{item.prompt.promptLetter}</h1>
            <p className="activity-instruction">
              {data.activityType === "ENGLISH_CASE_MATCH"
                ? "Which letter matches?"
                : "¿Cuál es su pareja?"}
            </p>
            <div className="case-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                {englishActivity ? "The match is" : "La pareja es"} <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "NAME_TILES" && (
          <>
            <h1>Construye tu nombre</h1>
            {(item.prompt.showModel || hint.name || reveal.name) && (
              <p className="name-model">{item.prompt.model || hint.name || reveal.name}</p>
            )}
            <div className="name-slots" aria-label="Nombre construido">
              {nameSlots.map((slot, position) => (
                <button
                  type="button"
                  className={`${slot.fixed ? "fixed" : ""} ${item.outcome && !slot.fixed && slot.value !== reveal.graphemes?.[position] ? "slot-needs-practice" : ""}`}
                  disabled={slot.fixed || Boolean(item.outcome)}
                  key={position}
                  onClick={() =>
                    slot.tileId &&
                    setSelectedTiles((current) => current.filter((id) => id !== slot.tileId))
                  }
                >
                  {slot.value || " "}
                  {item.outcome && !slot.fixed && slot.value !== reveal.graphemes?.[position] && (
                    <span className="slot-marker" aria-label="Necesita práctica">
                      ↺
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="name-tiles">
              {nameTiles.map((tile) => (
                <button
                  key={tile.id}
                  disabled={selectedSet.has(tile.id) || Boolean(item.outcome)}
                  onClick={() => setSelectedTiles((current) => [...current, tile.id])}
                >
                  {tile.value}
                </button>
              ))}
            </div>
            {!item.outcome && (
              <button
                className="primary-button name-check"
                disabled={busy || selectedTiles.length !== nameTiles.length}
                onClick={() => void act("ANSWER", selectedTiles)}
              >
                Comprobar
              </button>
            )}
          </>
        )}

        {data.activityType === "SYLLABLE_COUNT" && (
          <>
            <h1>Escucha y cuenta</h1>
            {item.media?.imageUrl && (
              <Image
                className="syllable-image"
                src={item.media.imageUrl}
                alt="Pista visual de la palabra"
                width={240}
                height={180}
                unoptimized
              />
            )}
            <button
              className="listen-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Escuchar palabra
            </button>
            {!item.outcome && (
              <div className="syllable-options">
                {([1, 2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    disabled={busy}
                    onClick={() => void act("ANSWER", String(count))}
                  >
                    <span>{"● ".repeat(count).trim()}</span>
                    <strong>{count}</strong>
                  </button>
                ))}
              </div>
            )}
            {item.outcome && (
              <div className="syllable-reveal">
                <strong>{reveal.word}</strong>
                <div className="syllable-beats">
                  {reveal.syllables?.map((syllable, beat) => (
                    <span key={`${syllable}-${beat}`}>{syllable}</span>
                  ))}
                </div>
                <p>
                  {reveal.count} {reveal.count === 1 ? "sílaba" : "sílabas"}
                </p>
              </div>
            )}
          </>
        )}

        {(data.activityType === "INITIAL_SOUND" ||
          data.activityType === "ENGLISH_INITIAL_SOUND") && (
          <>
            <h1>{englishActivity ? "What sound comes first?" : "¿Con qué sonido comienza?"}</h1>
            {englishActivity && (
              <div className="english-prompt-emoji" aria-hidden="true">
                {item.prompt.emoji}
              </div>
            )}
            {!englishActivity && item.media?.imageUrl && (
              <Image
                className="syllable-image"
                src={item.media.imageUrl}
                alt="Pista visual de la palabra"
                width={240}
                height={180}
                unoptimized
              />
            )}
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 {englishActivity ? "Listen" : "Escuchar palabra"}
            </button>
            <div className="initial-sound-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  {option}
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                {englishActivity ? "It starts with" : "Comienza con"} <strong>{item.hint}</strong>.
              </p>
            )}
            {item.outcome && (
              <div className="syllable-reveal">
                <strong>
                  {item.prompt.speechText?.toLocaleUpperCase(englishActivity ? "en-US" : "es")}
                </strong>
                <p>
                  {englishActivity ? "Starts with" : "Comienza con"}{" "}
                  {typeof item.reveal === "string" ? item.reveal : ""}
                </p>
              </div>
            )}
          </>
        )}

        {data.activityType === "SYLLABLE_BUILD" && (
          <>
            <h1>Construye la palabra</h1>
            {item.media?.imageUrl && (
              <Image
                className="syllable-image"
                src={item.media.imageUrl}
                alt="Pista visual de la palabra"
                width={240}
                height={180}
                unoptimized
              />
            )}
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Escuchar palabra
            </button>
            <PieceBuilder
              tiles={optionTiles}
              selected={selectedPieces}
              slotCount={item.prompt.slotCount || 0}
              busy={busy}
              answered={Boolean(item.outcome)}
              onChange={setSelectedPieces}
            />
            {!item.outcome && (
              <button
                className="primary-button name-check"
                disabled={busy || selectedPieces.length !== (item.prompt.slotCount || 0)}
                onClick={() => void act("ANSWER", chosenValues)}
              >
                Comprobar
              </button>
            )}
            {hint.syllables && !item.outcome && (
              <p className="activity-hint">
                Prueba este orden: <strong>{hint.syllables.join(" · ")}</strong>
              </p>
            )}
            {item.outcome && <WordReveal word={reveal.word} pieces={reveal.syllables} />}
          </>
        )}

        {data.activityType === "ENGLISH_VOCABULARY" && (
          <>
            <h1>Listen and choose</h1>
            <p className="activity-instruction">Escucha la palabra y toca el dibujo.</p>
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Listen again
            </button>
            <div className="english-picture-options">
              {optionTiles.map((tile) => (
                <button
                  className={
                    item.outcome && tile.value === item.reveal
                      ? "correct-option"
                      : item.outcome && tile.value === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={tile.id}
                  disabled={busy || Boolean(item.outcome)}
                  aria-label={item.outcome ? tile.value : `Opción ${tile.emoji}`}
                  onClick={() => void act("ANSWER", tile.value)}
                >
                  <span aria-hidden="true">{tile.emoji}</span>
                  {item.outcome && <strong>{tile.value}</strong>}
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                Busca <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "ENGLISH_CVC_BUILD" && (
          <>
            <h1>Build a word</h1>
            <div className="english-prompt-emoji" aria-hidden="true">
              {item.prompt.emoji}
            </div>
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Listen
            </button>
            <PieceBuilder
              tiles={optionTiles}
              selected={selectedPieces}
              slotCount={item.prompt.slotCount || 0}
              busy={busy}
              answered={Boolean(item.outcome)}
              onChange={setSelectedPieces}
              letters
            />
            {!item.outcome && (
              <button
                className="primary-button name-check"
                disabled={busy || selectedPieces.length !== (item.prompt.slotCount || 0)}
                onClick={() => void act("ANSWER", chosenValues)}
              >
                Check
              </button>
            )}
            {hint.letters && !item.outcome && (
              <p className="activity-hint">
                Try: <strong>{hint.letters.join(" · ")}</strong>
              </p>
            )}
            {item.outcome && <WordReveal word={reveal.word} pieces={reveal.letters} />}
          </>
        )}

        {data.activityType === "ENGLISH_SIGHT_WORD" && (
          <>
            <h1>Find the word</h1>
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Listen
            </button>
            <div className="english-word-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  {option.toLocaleLowerCase("en-US")}
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                Find <strong>{item.hint.toLocaleLowerCase("en-US")}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "MATH_NUMBER_QUANTITY" && (
          <>
            <h1>Busca la cantidad</h1>
            <div className="math-number-target" aria-label={`Número ${item.prompt.number}`}>
              {item.prompt.number}
            </div>
            <p className="activity-instruction">¿Cuál grupo tiene {item.prompt.number}?</p>
            <div className="math-quantity-options">
              {optionTiles.map((tile) => (
                <button
                  className={
                    item.outcome && tile.value === item.reveal
                      ? "correct-option"
                      : item.outcome && tile.value === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={tile.id}
                  disabled={busy || Boolean(item.outcome)}
                  aria-label={`${tile.count} puntos`}
                  onClick={() => void act("ANSWER", tile.value)}
                >
                  <DotGroup count={tile.count || 0} />
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                Busca el grupo con <strong>{item.hint}</strong> puntos.
              </p>
            )}
          </>
        )}

        {data.activityType === "MATH_COUNT_OBJECTS" && (
          <>
            <h1>Cuenta los objetos</h1>
            <ObjectGroup count={item.prompt.count || 0} emoji={item.prompt.emoji || "⭐"} />
            <p className="activity-instruction">¿Cuántos hay?</p>
            <MathNumberOptions
              item={item}
              busy={busy}
              onAnswer={(value) => void act("ANSWER", value)}
            />
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                Cuenta despacio. Hay <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "MATH_COMPARE_QUANTITIES" && (
          <>
            <h1>¿Dónde hay más?</h1>
            <div className="math-compare-groups">
              <button
                className={
                  item.outcome && item.reveal === "LEFT"
                    ? "correct-option"
                    : item.outcome && item.firstResponse === "LEFT"
                      ? "selected-wrong"
                      : ""
                }
                disabled={busy || Boolean(item.outcome)}
                aria-label={`Grupo izquierdo, ${item.prompt.left} objetos`}
                onClick={() => void act("ANSWER", "LEFT")}
              >
                <ObjectGroup
                  count={item.prompt.left || 0}
                  emoji={item.prompt.emoji || "⭐"}
                  compact
                />
              </button>
              <span>o</span>
              <button
                className={
                  item.outcome && item.reveal === "RIGHT"
                    ? "correct-option"
                    : item.outcome && item.firstResponse === "RIGHT"
                      ? "selected-wrong"
                      : ""
                }
                disabled={busy || Boolean(item.outcome)}
                aria-label={`Grupo derecho, ${item.prompt.right} objetos`}
                onClick={() => void act("ANSWER", "RIGHT")}
              >
                <ObjectGroup
                  count={item.prompt.right || 0}
                  emoji={item.prompt.emoji || "⭐"}
                  compact
                />
              </button>
            </div>
            <button
              className={`math-same-button ${item.outcome && item.reveal === "SAME" ? "correct-option" : item.outcome && item.firstResponse === "SAME" ? "selected-wrong" : ""}`}
              disabled={busy || Boolean(item.outcome)}
              onClick={() => void act("ANSWER", "SAME")}
            >
              Tienen la misma cantidad
            </button>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">Cuenta los dos grupos antes de elegir.</p>
            )}
          </>
        )}

        {data.activityType === "MATH_NUMBER_SEQUENCE" && (
          <>
            <h1>¿Qué número falta?</h1>
            <div className="math-sequence" aria-label="Secuencia de números">
              {item.prompt.values?.map((value, position) => (
                <span
                  className={position === item.prompt.missingIndex ? "missing" : ""}
                  key={`${value}-${position}`}
                >
                  {position === item.prompt.missingIndex
                    ? item.outcome
                      ? typeof item.reveal === "string"
                        ? item.reveal
                        : value
                      : "?"
                    : value}
                </span>
              ))}
            </div>
            <MathNumberOptions
              item={item}
              busy={busy}
              onAnswer={(value) => void act("ANSWER", value)}
            />
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                El número que falta es <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {(data.activityType === "MATH_ADDITION" || data.activityType === "MATH_SUBTRACTION") && (
          <>
            <h1>{data.activityType === "MATH_ADDITION" ? "Junta y suma" : "Quita y resta"}</h1>
            <div className="math-operation-visual">
              <ObjectGroup
                count={item.prompt.left || 0}
                emoji={item.prompt.emoji || "⭐"}
                compact
              />
              <strong>{item.prompt.operator}</strong>
              <ObjectGroup
                count={item.prompt.right || 0}
                emoji={item.prompt.emoji || "⭐"}
                compact
                faded={data.activityType === "MATH_SUBTRACTION"}
              />
            </div>
            <div className="math-equation-prompt">
              <span>{item.prompt.left}</span>
              <span>{item.prompt.operator}</span>
              <span>{item.prompt.right}</span>
              <span>=</span>
              <span className="answer">{item.outcome ? reveal.answer : "?"}</span>
            </div>
            {!item.outcome && (
              <MathNumberOptions
                item={item}
                busy={busy}
                onAnswer={(value) => void act("ANSWER", value)}
              />
            )}
            {hint.answer !== undefined && !item.outcome && (
              <p className="activity-hint">
                La respuesta es <strong>{hint.answer}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "MATH_PLACE_VALUE" && (
          <>
            <h1>Decenas y unidades</h1>
            <p className="activity-instruction">¿Qué número forman estos bloques?</p>
            <PlaceValueBlocks tens={item.prompt.tens || 0} ones={item.prompt.ones || 0} />
            <MathNumberOptions
              item={item}
              busy={busy}
              onAnswer={(value) => void act("ANSWER", value)}
            />
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                Forman el número <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {data.activityType === "MATH_COMPARE_TWO_DIGIT" && (
          <>
            <h1>¿Cuál número es mayor?</h1>
            <p className="activity-instruction">Compara primero las decenas.</p>
            <div className="two-digit-compare-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  <TwoDigitNumber value={Number(option)} />
                </button>
              ))}
            </div>
            {typeof item.hint === "string" && !item.outcome && (
              <p className="activity-hint">
                El mayor es <strong>{item.hint}</strong>.
              </p>
            )}
          </>
        )}

        {(data.activityType === "MATH_ADDITION_TWO_DIGIT" ||
          data.activityType === "MATH_SUBTRACTION_TWO_DIGIT") && (
          <>
            <h1>
              {data.activityType === "MATH_ADDITION_TWO_DIGIT"
                ? "Suma dos dígitos"
                : "Resta dos dígitos"}
            </h1>
            <p className="activity-instruction">Resuelve unidades y después decenas.</p>
            <div className="two-digit-operation-visual">
              <TwoDigitNumber value={item.prompt.left || 0} />
              <strong>{item.prompt.operator}</strong>
              <TwoDigitNumber value={item.prompt.right || 0} />
            </div>
            <div className="math-equation-prompt two-digit-equation">
              <span>{item.prompt.left}</span>
              <span>{item.prompt.operator}</span>
              <span>{item.prompt.right}</span>
              <span>=</span>
              <span className="answer">{item.outcome ? reveal.answer : "?"}</span>
            </div>
            {!item.outcome && (
              <MathNumberOptions
                item={item}
                busy={busy}
                onAnswer={(value) => void act("ANSWER", value)}
              />
            )}
            {hint.answer !== undefined && !item.outcome && (
              <p className="activity-hint">
                La respuesta es <strong>{hint.answer}</strong>.
              </p>
            )}
          </>
        )}

        {(data.activityType === "MATH_STORY_ADDITION" ||
          data.activityType === "MATH_STORY_SUBTRACTION") && (
          <>
            <h1>Un problema de cada día</h1>
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Escuchar otra vez
            </button>
            <div className="math-story-card">
              <span aria-hidden="true">{item.prompt.emoji}</span>
              <p>{item.prompt.story}</p>
            </div>
            <div className="math-operation-visual math-story-objects">
              <ObjectGroup
                count={item.prompt.left || 0}
                emoji={item.prompt.emoji || "⭐"}
                compact
              />
              <strong>{item.prompt.operator}</strong>
              <ObjectGroup
                count={item.prompt.right || 0}
                emoji={item.prompt.emoji || "⭐"}
                compact
                faded={data.activityType === "MATH_STORY_SUBTRACTION"}
              />
            </div>
            {!item.outcome && (
              <MathNumberOptions
                item={item}
                busy={busy}
                onAnswer={(value) => void act("ANSWER", value)}
              />
            )}
            {hint.answer !== undefined && !item.outcome && (
              <p className="activity-hint">
                Piensa en la historia: quedan <strong>{hint.answer}</strong>.
              </p>
            )}
            {item.outcome && <p className="story-answer-reveal">{reveal.equation}</p>}
          </>
        )}

        {data.activityType === "LOGIC_SHAPE" && (
          <>
            <h1>Encuentra el {item.prompt.label}</h1>
            <p className="activity-instruction">Toca la forma correcta.</p>
            <div className="logic-shape-options">
              {optionTiles.map((tile) => (
                <button
                  className={
                    item.outcome && tile.value === item.reveal
                      ? "correct-option"
                      : item.outcome && tile.value === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={tile.id}
                  disabled={busy || Boolean(item.outcome)}
                  aria-label={tile.label}
                  onClick={() => void act("ANSWER", tile.value)}
                >
                  <span
                    className={`logic-shape logic-shape-${tile.shape}`}
                    style={{ "--shape-color": tile.color } as React.CSSProperties}
                    aria-hidden="true"
                  />
                  <strong>{tile.label}</strong>
                </button>
              ))}
            </div>
          </>
        )}

        {data.activityType === "LOGIC_SORT" && (
          <>
            <h1>¿Cuál pertenece al grupo?</h1>
            <p className="logic-rule">{item.prompt.question}</p>
            <div className="story-options">
              {optionTiles.map((tile) => (
                <button
                  className={
                    item.outcome && tile.value === item.reveal
                      ? "correct-option"
                      : item.outcome && tile.value === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={tile.id}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", tile.value)}
                >
                  <span aria-hidden="true">{tile.emoji}</span>
                  <strong>{tile.label}</strong>
                </button>
              ))}
            </div>
          </>
        )}

        {data.activityType === "LOGIC_PATTERN" && (
          <>
            <h1>¿Qué sigue?</h1>
            <div className="logic-pattern" aria-label="Patrón para completar">
              {item.prompt.values?.map((value, position) => (
                <span key={`${value}-${position}`}>{value}</span>
              ))}
              <span className="missing">{item.outcome ? (item.reveal as string) : "?"}</span>
            </div>
            <div className="logic-pattern-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {data.activityType === "LOGIC_POSITION" && (
          <>
            <h1>¿Dónde está la estrella?</h1>
            <div className="logic-position-demo" aria-label="Una estrella y una caja">
              <span className={`logic-position-star is-${item.prompt.position}`}>⭐</span>
              <span className="logic-position-box">📦</span>
            </div>
            <div className="logic-word-options">
              {(item.options as string[]).map((option) => (
                <button
                  className={
                    item.outcome && option === item.reveal
                      ? "correct-option"
                      : item.outcome && option === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={option}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {data.activityType === "LOGIC_MEASURE" && (
          <>
            <h1>{item.prompt.question}</h1>
            <div className="logic-measure-options">
              {(["LEFT", "RIGHT"] as const).map((side) => {
                const length = side === "LEFT" ? item.prompt.left || 0 : item.prompt.right || 0;
                const label = side === "LEFT" ? item.prompt.leftLabel : item.prompt.rightLabel;
                return (
                  <button
                    className={
                      item.outcome && side === item.reveal
                        ? "correct-option"
                        : item.outcome && side === item.firstResponse
                          ? "selected-wrong"
                          : ""
                    }
                    key={side}
                    disabled={busy || Boolean(item.outcome)}
                    onClick={() => void act("ANSWER", side)}
                  >
                    <span className="measure-bar" style={{ width: length }} />
                    <strong>{label}</strong>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {data.activityType.startsWith("STORY_") && (
          <>
            <h1>{item.prompt.title}</h1>
            <button
              className="listen-word-button"
              disabled={busy}
              onClick={() => void playCurrentWord(item)}
            >
              🔊 Escuchar cuento
            </button>
            <div className="story-card">
              <div className="story-scenes" aria-hidden="true">
                {item.prompt.scenes?.map((scene, position) => (
                  <span key={`${scene}-${position}`}>{scene}</span>
                ))}
              </div>
              <p>{item.prompt.story}</p>
            </div>
            {item.prompt.word && (
              <p className="story-word">
                Palabra nueva: <strong>{item.prompt.word}</strong>
              </p>
            )}
            <h2 className="story-question">{item.prompt.question}</h2>
            <div className="story-options">
              {optionTiles.map((tile) => (
                <button
                  className={
                    item.outcome && tile.value === item.reveal
                      ? "correct-option"
                      : item.outcome && tile.value === item.firstResponse
                        ? "selected-wrong"
                        : ""
                  }
                  key={tile.id}
                  disabled={busy || Boolean(item.outcome)}
                  onClick={() => void act("ANSWER", tile.value)}
                >
                  <span aria-hidden="true">{tile.emoji}</span>
                  <strong>{tile.label}</strong>
                </button>
              ))}
            </div>
          </>
        )}

        {audioError && !item.outcome && audioActivityTypes.includes(data.activityType) && (
          <div className="technical-skip">
            <p>No hay audio disponible en este dispositivo.</p>
            <button
              className="secondary-button"
              onClick={() => void act("SKIP", undefined, "Audio no disponible")}
            >
              Saltar
            </button>
          </div>
        )}
        {item.outcome && (
          <div className={`feedback outcome-${item.outcome.toLowerCase()}`} role="status">
            <strong>
              {englishActivity && item.outcome === "CORRECT"
                ? "Great job!"
                : feedbackText[item.outcome]}
            </strong>
            {["CASE_MATCH", "ENGLISH_CASE_MATCH"].includes(data.activityType) && (
              <span> {typeof item.reveal === "string" ? item.reveal : ""}</span>
            )}
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <div className="activity-controls">
          {!item.outcome && (
            <>
              <button className="secondary-button" disabled={busy} onClick={() => void act("HELP")}>
                💡 {englishActivity ? "Help" : "Ayuda"}
              </button>
              <button className="link-button" disabled={busy} onClick={() => void act("SKIP")}>
                {englishActivity ? "Skip" : "Saltar"}
              </button>
            </>
          )}
          {item.outcome && (
            <button className="primary-button" onClick={next}>
              {index + 1 === data.actualCount
                ? englishActivity
                  ? "See results"
                  : "Ver resultado"
                : englishActivity
                  ? "Next"
                  : "Siguiente"}{" "}
              →
            </button>
          )}
        </div>
        {!mathActivity && (
          <label className="volume-control">
            Volumen{" "}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={speaker.volume}
              onChange={(event) => speaker.setVolume(Number(event.target.value))}
            />
          </label>
        )}
      </section>
    </main>
  );
}

function MathNumberOptions({
  item,
  busy,
  onAnswer
}: {
  item: Item;
  busy: boolean;
  onAnswer: (value: string) => void;
}) {
  return (
    <div className="math-number-options">
      {(item.options as string[]).map((option) => (
        <button
          className={
            item.outcome &&
            String(option) ===
              String(
                typeof item.reveal === "object" && item.reveal ? item.reveal.answer : item.reveal
              )
              ? "correct-option"
              : item.outcome && String(option) === String(item.firstResponse)
                ? "selected-wrong"
                : ""
          }
          key={option}
          disabled={busy || Boolean(item.outcome)}
          onClick={() => onAnswer(String(option))}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function PlaceValueBlocks({ tens, ones }: { tens: number; ones: number }) {
  return (
    <div className="place-value-blocks" aria-label={`${tens} decenas y ${ones} unidades`}>
      <div>
        <span className="place-value-label">Decenas</span>
        <span className="tens-rods" aria-hidden="true">
          {Array.from({ length: tens }, (_, index) => (
            <i key={index} />
          ))}
        </span>
        <strong>{tens}</strong>
      </div>
      <div>
        <span className="place-value-label">Unidades</span>
        <span className="ones-blocks" aria-hidden="true">
          {Array.from({ length: ones }, (_, index) => (
            <i key={index} />
          ))}
        </span>
        <strong>{ones}</strong>
      </div>
    </div>
  );
}

function TwoDigitNumber({ value }: { value: number }) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return (
    <span className="two-digit-number" aria-label={`${value}: ${tens} decenas y ${ones} unidades`}>
      <span>
        <small>D</small>
        <strong>{tens}</strong>
      </span>
      <span>
        <small>U</small>
        <strong>{ones}</strong>
      </span>
    </span>
  );
}

function DotGroup({ count }: { count: number }) {
  return (
    <span className="math-dot-group" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

function ObjectGroup({
  count,
  emoji,
  compact = false,
  faded = false
}: {
  count: number;
  emoji: string;
  compact?: boolean;
  faded?: boolean;
}) {
  return (
    <span
      className={`math-object-group ${compact ? "compact" : ""} ${faded ? "faded" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <i key={index}>{emoji}</i>
      ))}
      {count === 0 && <i className="empty">0</i>}
    </span>
  );
}

function PieceBuilder({
  tiles,
  selected,
  slotCount,
  busy,
  answered,
  onChange,
  letters = false
}: {
  tiles: Tile[];
  selected: number[];
  slotCount: number;
  busy: boolean;
  answered: boolean;
  onChange: React.Dispatch<React.SetStateAction<number[]>>;
  letters?: boolean;
}) {
  return (
    <>
      <div
        className={`build-syllable-slots ${letters ? "letter-slots" : ""}`}
        aria-label="Palabra construida"
      >
        {Array.from({ length: slotCount }, (_, position) => {
          const optionIndex = selected[position];
          return (
            <button
              type="button"
              disabled={answered || optionIndex === undefined}
              onClick={() =>
                onChange((current) => current.filter((_, index) => index !== position))
              }
              key={position}
            >
              {optionIndex === undefined ? " " : tiles[optionIndex]?.value}
            </button>
          );
        })}
      </div>
      <div className={`build-syllable-options ${letters ? "letter-options" : ""}`}>
        {tiles.map((tile, optionIndex) => (
          <button
            key={tile.id}
            disabled={
              busy || answered || selected.includes(optionIndex) || selected.length >= slotCount
            }
            onClick={() => onChange((current) => [...current, optionIndex])}
          >
            {tile.value}
          </button>
        ))}
      </div>
    </>
  );
}

function WordReveal({ word, pieces }: { word?: string; pieces?: string[] }) {
  return (
    <div className="syllable-reveal">
      <strong>{word}</strong>
      <div className="syllable-beats">
        {pieces?.map((piece, index) => (
          <span key={`${piece}-${index}`}>{piece}</span>
        ))}
      </div>
    </div>
  );
}
