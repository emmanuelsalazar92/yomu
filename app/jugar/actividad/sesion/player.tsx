"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClientUuid } from "@/lib/client-uuid";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Outcome = "CORRECT" | "INCORRECT" | "ASSISTED" | "SKIPPED";
type ActivityType = "CASE_MATCH" | "NAME_TILES" | "SYLLABLE_COUNT";
type Tile = { id: string; value: string };
type Prompt = {
  letter?: string; direction?: string; promptLetter?: string; spokenPrompt?: string;
  mode?: string; showModel?: boolean; model?: string | null; slotCount?: number;
  fixed?: Array<{ index: number; value: string }>; tiles?: Tile[];
  speechText?: string; hasCustomAudio?: boolean;
};
type Reveal = { tileIds?: string[]; name?: string; graphemes?: string[]; count?: number; syllables?: string[]; word?: string } | string | null;
type Item = { id: string; position: number; targetKey: string; prompt: Prompt; options: Array<string | number | Tile>; outcome: Outcome | null; helpUsed: boolean; firstResponse: string | string[] | { tileIds: string[]; correctPositions: number[]; incorrectPositions: number[] } | null; reveal: Reveal; hint: Reveal; media: { imageUrl: string | null; audioUrl: string | null } | null };
type Session = { id: string; activityType: ActivityType; mode: string; requestedCount: number; actualCount: number; status: "ACTIVE" | "COMPLETED"; score: number | null; childProfile: { id: string; nickname: string; avatar: string | null }; items: Item[] };

const feedbackText: Record<Outcome, string> = {
  CORRECT: "¡Muy bien!", ASSISTED: "¡Lo lograste con una pista!", INCORRECT: "Buen intento. Mira la respuesta.", SKIPPED: "Lo dejamos para el repaso."
};

function timeNow() { return Date.now(); }

function revealObject(value: Reveal) {
  return value && typeof value === "object" ? value : {};
}

export default function ActivityPlayer() {
  const params = useSearchParams();
  const [data, setData] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [audioError, setAudioError] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const startedAt = useRef(0);
  const busyRef = useRef(false);
  const item = data?.items[index];
  const speaker = useWordSpeaker(item?.id, item?.media?.audioUrl);

  useEffect(() => {
    const resume = params.get("resume");
    const request = resume ? fetch(`/api/activities/sessions/${resume}`) : fetch("/api/activities/sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childProfileId: params.get("profile"), activityType: params.get("type"), mode: params.get("mode"),
        requestedCount: Number(params.get("count") || 5), requestKey: params.get("requestKey"),
        categoryId: params.get("category") || undefined,
        difficulty: params.get("difficulty") ? Number(params.get("difficulty")) : undefined
      })
    });
    request.then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo preparar la actividad.");
      return payload as Session;
    }).then((session) => {
      const pending = session.items.findIndex((current) => current.outcome === null);
      setData(session); setIndex(pending < 0 ? Math.max(0, session.items.length - 1) : pending);
      setShowResults(pending < 0); startedAt.current = timeNow();
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo preparar la actividad."));
  }, [params]);

  useEffect(() => {
    if (data?.activityType === "SYLLABLE_COUNT" && item && !item.outcome) {
      void speaker.play(item.prompt.speechText || "", item.media?.audioUrl).catch(() => setAudioError(true));
    }
    // speaker is stable for the active item; item.id intentionally owns this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, data?.activityType]);

  async function act(action: "ANSWER" | "HELP" | "SKIP", response?: string | string[], technicalReason?: string) {
    if (!data || !item || busyRef.current || item.outcome) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const result = await fetch(`/api/activities/sessions/${data.id}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, action, response, responseTimeMs: timeNow() - startedAt.current, technicalReason })
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || "No se pudo guardar.");
      setData(payload);
      if (action === "HELP") {
        const current = payload.items[index] as Item;
        if (payload.activityType === "CASE_MATCH") await speaker.play(current.prompt.spokenPrompt || current.prompt.promptLetter || "");
        if (payload.activityType === "SYLLABLE_COUNT") await speaker.play(current.prompt.speechText || "", current.media?.audioUrl);
      } else {
        const current = payload.items[index] as Item;
        const currentReveal = revealObject(current.reveal);
        if (payload.activityType === "CASE_MATCH") await speaker.play(current.prompt.spokenPrompt || current.prompt.promptLetter || "");
        if (payload.activityType === "NAME_TILES") await speaker.play(`Este es tu nombre: ${currentReveal.name || ""}`);
        if (payload.activityType === "SYLLABLE_COUNT") await speaker.play(current.prompt.speechText || "", current.media?.audioUrl);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function next() {
    if (!data) return;
    const pending = data.items.findIndex((current, position) => position > index && current.outcome === null);
    if (pending >= 0) { setSelectedTiles([]); setAudioError(false); startedAt.current = timeNow(); setIndex(pending); } else setShowResults(true);
  }

  async function review() {
    if (!data || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/activities/sessions/${data.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestKey: createClientUuid() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No hay elementos para repasar.");
      setData(payload); setIndex(0); setShowResults(false); setSelectedTiles([]); setAudioError(false); startedAt.current = timeNow();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo crear el repaso."); }
    finally { setBusy(false); }
  }

  const summary = useMemo(() => data ? {
    correct: data.items.filter((current) => current.outcome === "CORRECT").length,
    assisted: data.items.filter((current) => current.outcome === "ASSISTED").length,
    review: data.items.filter((current) => current.outcome === "INCORRECT" || current.outcome === "SKIPPED").length
  } : null, [data]);

  if (error && !data) return <main className="game-shell"><section className="panel activity-error"><h1>No pudimos iniciar</h1><p className="error-text">{error}</p><Link className="secondary-button" href="/jugar">Volver</Link></section></main>;
  if (!data || !item || !summary) return <main className="game-shell"><p>Preparando actividad…</p></main>;
  if (showResults) return <main className="game-shell"><section className="result-card activity-result"><span className="result-emoji">🌟</span><p className="eyebrow">Actividad terminada</p><h1>¡Gran práctica, {data.childProfile.nickname}!</h1><div className="activity-result-grid"><div><strong>{summary.correct}</strong><span>sin ayuda</span></div><div><strong>{summary.assisted}</strong><span>con pista</span></div><div><strong>{summary.review}</strong><span>para repasar</span></div></div>{error && <p className="error-text">{error}</p>}<div className="button-row">{summary.review > 0 && <button className="primary-button" disabled={busy} onClick={() => void review()}>Repasar ahora</button>}<Link className="secondary-button" href={`/jugar/actividad?tipo=${data.activityType}&perfil=${data.childProfile.id}`}>Otra sesión</Link><Link className="secondary-button" href={`/jugar?perfil=${data.childProfile.id}`}>Elegir actividad</Link></div></section></main>;

  const reveal = revealObject(item.reveal);
  const hint = revealObject(item.hint);
  const tiles = (item.prompt.tiles || []) as Tile[];
  const selectedSet = new Set(selectedTiles);
  const fixed = new Map((item.prompt.fixed || []).map((entry) => [entry.index, entry.value]));
  let movableCursor = 0;
  const slots = Array.from({ length: item.prompt.slotCount || tiles.length }, (_, position) => {
    if (fixed.has(position)) return { fixed: true, value: fixed.get(position) || " " };
    const tileId = selectedTiles[movableCursor++];
    return { fixed: false, value: tiles.find((tile) => tile.id === tileId)?.value || "" , tileId };
  });

  return <main className="game-shell activity-player">
    <header className="game-header"><Link className="brand" href={`/jugar?perfil=${data.childProfile.id}`}><span className="brand-mark">よ</span> Yomu</Link><span>{data.childProfile.avatar || "🌱"} {data.childProfile.nickname}</span></header>
    <div className="progress-track" aria-label={`Reto ${index + 1} de ${data.actualCount}`}><span className="progress-fill" style={{ width: `${((index + (item.outcome ? 1 : 0)) / data.actualCount) * 100}%` }} /></div>
    <section className="activity-stage panel">
      <p className="eyebrow">Reto {index + 1} de {data.actualCount}</p>
      {data.activityType === "CASE_MATCH" && <>
        <h1 className="case-prompt">{item.prompt.promptLetter}</h1><p className="activity-instruction">¿Cuál es su pareja?</p>
        <div className="case-options">{(item.options as string[]).map((option) => <button className={item.outcome && option === item.reveal ? "correct-option" : item.outcome && option === item.firstResponse ? "selected-wrong" : ""} key={option} disabled={busy || Boolean(item.outcome)} onClick={() => void act("ANSWER", option)}>{option}</button>)}</div>
        {typeof item.hint === "string" && !item.outcome && <p className="activity-hint">La pareja es <strong>{item.hint}</strong>.</p>}
      </>}
      {data.activityType === "NAME_TILES" && <>
        <h1>Construye tu nombre</h1>{(item.prompt.showModel || hint.name || reveal.name) && <p className="name-model">{item.prompt.model || hint.name || reveal.name}</p>}
        <div className="name-slots" aria-label="Nombre construido">{slots.map((slot, position) => <button type="button" className={`${slot.fixed ? "fixed" : ""} ${item.outcome && !slot.fixed && slot.value !== reveal.graphemes?.[position] ? "slot-needs-practice" : ""}`} disabled={slot.fixed || Boolean(item.outcome)} key={position} onClick={() => slot.tileId && setSelectedTiles((current) => current.filter((id) => id !== slot.tileId))}>{slot.value || " "}{item.outcome && !slot.fixed && slot.value !== reveal.graphemes?.[position] && <span className="slot-marker" aria-label="Necesita práctica">↺</span>}</button>)}</div>
        <div className="name-tiles">{tiles.map((tile) => <button key={tile.id} disabled={selectedSet.has(tile.id) || Boolean(item.outcome)} onClick={() => setSelectedTiles((current) => [...current, tile.id])}>{tile.value}</button>)}</div>
        {!item.outcome && <button className="primary-button name-check" disabled={busy || selectedTiles.length !== tiles.length} onClick={() => void act("ANSWER", selectedTiles)}>Comprobar</button>}
      </>}
      {data.activityType === "SYLLABLE_COUNT" && <>
        <h1>Escucha y cuenta</h1>
        {item.media?.imageUrl && <Image className="syllable-image" src={item.media.imageUrl} alt="Pista visual de la palabra" width={240} height={180} unoptimized />}
        <button className="listen-button" disabled={busy} onClick={() => void speaker.play(item.prompt.speechText || "", item.media?.audioUrl).then(() => setAudioError(false)).catch(() => setAudioError(true))}>🔊 Escuchar palabra</button>
        {!item.outcome && <div className="syllable-options">{([1, 2, 3, 4] as const).map((count) => <button key={count} disabled={busy} onClick={() => void act("ANSWER", String(count))}><span>{"● ".repeat(count).trim()}</span><strong>{count}</strong></button>)}</div>}
        {audioError && !item.outcome && <div className="technical-skip"><p>No hay audio disponible en este dispositivo.</p><button className="secondary-button" onClick={() => void act("SKIP", undefined, "Audio no disponible")}>Saltar sin penalizar el flujo</button></div>}
        {item.outcome && <div className="syllable-reveal"><strong>{reveal.word}</strong><div className="syllable-beats">{reveal.syllables?.map((syllable, beat) => <span style={{ animationDelay: `${beat * 120}ms` }} key={`${syllable}-${beat}`}>{syllable}</span>)}</div><p>{reveal.count} {reveal.count === 1 ? "sílaba" : "sílabas"}</p></div>}
      </>}
      {item.outcome && <div className={`feedback outcome-${item.outcome.toLowerCase()}`} role="status"><strong>{feedbackText[item.outcome]}</strong>{data.activityType === "CASE_MATCH" && <span> {typeof item.reveal === "string" ? item.reveal : ""}</span>}</div>}
      {error && <p className="error-text">{error}</p>}
      <div className="activity-controls">
        {!item.outcome && <><button className="secondary-button" disabled={busy} onClick={() => void act("HELP")}>💡 Ayuda</button><button className="link-button" disabled={busy} onClick={() => void act("SKIP")}>Saltar</button></>}
        {item.outcome && <button className="primary-button" onClick={next}>{index + 1 === data.actualCount ? "Ver resultado" : "Siguiente"} →</button>}
      </div>
      <label className="volume-control">Volumen <input type="range" min="0" max="1" step="0.1" value={speaker.volume} onChange={(event) => speaker.setVolume(Number(event.target.value))} /></label>
    </section>
  </main>;
}
