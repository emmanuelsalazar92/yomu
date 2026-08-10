"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClientUuid } from "@/lib/client-uuid";

type Profile = { id: string; nickname: string; avatar: string | null };
type Category = { id: string; name: string };
type Availability = {
  requestedCount: number;
  availableCount: number;
  actualCount: number;
  message: string;
};

const modes = [
  ["WITH_IMAGE", "Con imagen", "Veo una pista para reconocer la palabra", "🖼️"],
  ["WITHOUT_IMAGE", "Sin imagen", "Me concentro solamente en sus letras", "🔤"],
  ["LISTEN", "Escuchar", "Oigo la palabra todas las veces que quiera", "🔊"]
] as const;
const exercises = [
  ["ONE_VOWEL", "Una vocal", "Completa un espacio"],
  ["ALL_VOWELS", "Todas las vocales", "Completa cada espacio"],
  ["INITIAL_VOWEL", "Vocal inicial", "¿Con cuál comienza?"],
  ["MIXED", "Mixto", "Un poco de cada reto"]
] as const;

export default function GameSetup({
  profiles,
  categories,
  initialProfile
}: {
  profiles: Profile[];
  categories: Category[];
  initialProfile?: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(
    initialProfile && profiles.some((item) => item.id === initialProfile)
      ? initialProfile
      : (profiles[0]?.id ?? "")
  );
  const [mode, setMode] = useState("WITH_IMAGE");
  const [type, setType] = useState("MIXED");
  const [count, setCount] = useState(10);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");
  const [checking, setChecking] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChecking(true);
      setAvailabilityError("");
      try {
        const response = await fetch("/api/game/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            childProfileId: profile,
            helpMode: mode,
            exerciseType: type,
            requestedCount: count,
            categoryId: category || undefined,
            difficulty: difficulty ? Number(difficulty) : undefined,
            includeLearned: false
          })
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "No se pudo calcular la disponibilidad.");
        setAvailability(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          setAvailability(null);
          setAvailabilityError(
            error instanceof Error ? error.message : "No se pudo calcular la disponibilidad."
          );
        }
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 150);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [profile, mode, type, count, category, difficulty]);

  function start() {
    if (startingRef.current || checking || !availability?.actualCount) return;
    startingRef.current = true;
    setStarting(true);
    const params = new URLSearchParams({
      profile,
      mode,
      type,
      count: String(count),
      requestKey: createClientUuid()
    });
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    router.push(`/jugar/sesion?${params}`);
  }

  return (
    <main className="setup shell">
      <Link className="brand" href="/">
        <span className="brand-mark">よ</span> Yomu
      </Link>
      <div style={{ marginTop: 34 }}>
        <p className="eyebrow">Preparamos la aventura</p>
        <h1 className="page-title">¿Cómo quieres jugar?</h1>
      </div>
      {profiles.length > 1 && (
        <section className="setup-section">
          <h2>Perfil</h2>
          <div className="pill-row">
            {profiles.map((item) => (
              <button
                className={`pill ${profile === item.id ? "selected" : ""}`}
                aria-pressed={profile === item.id}
                onClick={() => setProfile(item.id)}
                key={item.id}
              >
                {item.avatar || "🌱"} {item.nickname}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="setup-section">
        <h2>Elige una ayuda</h2>
        <div className="choice-grid">
          {modes.map(([value, title, description, icon]) => (
            <button
              className={`choice-card ${mode === value ? "selected" : ""}`}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              key={value}
            >
              <span style={{ fontSize: "2rem" }}>{icon}</span>
              <strong>{title}</strong>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="setup-section">
        <h2>Elige el reto</h2>
        <div className="choice-grid">
          {exercises.map(([value, title, description]) => (
            <button
              className={`choice-card ${type === value ? "selected" : ""}`}
              aria-pressed={type === value}
              onClick={() => setType(value)}
              key={value}
            >
              <strong>{title}</strong>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="setup-section">
        <h2>¿Cuántas palabras?</h2>
        <div className="pill-row">
          {[10, 20, 30].map((value) => (
            <button
              className={`pill ${count === value ? "selected" : ""}`}
              aria-pressed={count === value}
              onClick={() => setCount(value)}
              key={value}
            >
              {value}
            </button>
          ))}
        </div>
      </section>
      <section className="setup-section setup-filters">
        {categories.length > 0 && (
          <div className="form-field">
            <label htmlFor="category">Tema (opcional)</label>
            <select
              id="category"
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="form-field">
          <label htmlFor="difficulty">Nivel (opcional)</label>
          <select
            id="difficulty"
            className="select"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">Todos los niveles</option>
            <option value="1">1 · Inicial</option>
            <option value="2">2 · Medio</option>
            <option value="3">3 · Reto</option>
          </select>
        </div>
      </section>
      <div
        className={`availability-card ${availability?.availableCount === 0 ? "empty" : ""}`}
        role="status"
        aria-live="polite"
      >
        {checking ? (
          <p>Calculando palabras únicas disponibles…</p>
        ) : availabilityError ? (
          <p>{availabilityError}</p>
        ) : availability ? (
          <>
            <strong>{availability.availableCount} palabras únicas disponibles</strong>
            <p>{availability.message}</p>
            {availability.actualCount > 0 && (
              <p>
                Esta sesión tendrá <strong>{availability.actualCount}</strong> ejercicios sin
                repetir palabras.
              </p>
            )}
          </>
        ) : (
          <p>Elige una configuración para comprobar la disponibilidad.</p>
        )}
      </div>
      <div className="setup-actions">
        <button
          className="primary-button"
          disabled={!profile || checking || starting || !availability?.actualCount}
          onClick={start}
        >
          {starting ? "Preparando…" : "¡A jugar!"} <span aria-hidden="true">→</span>
        </button>
      </div>
    </main>
  );
}
