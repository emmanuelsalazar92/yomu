"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClientUuid } from "@/lib/client-uuid";

type ActivityType = "CASE_MATCH" | "NAME_TILES" | "SYLLABLE_COUNT";
type Profile = { id: string; nickname: string; avatar: string | null; practiceName: string | null; nameActivityEnabled: boolean };

const details = {
  CASE_MATCH: { eyebrow: "Letras compañeras", title: "Mayúscula y minúscula", description: "Mira una letra y encuentra su pareja.", icon: "Aa", modes: [["UPPER_TO_LOWER", "A → a", "De mayúscula a minúscula"], ["LOWER_TO_UPPER", "a → A", "De minúscula a mayúscula"], ["MIXED", "Aa", "Las dos direcciones"]] },
  NAME_TILES: { eyebrow: "Mi palabra especial", title: "Construye tu nombre", description: "Ordena cada ficha y comprueba al final.", icon: "🧩", modes: [["WITH_MODEL", "👀", "Con modelo"], ["WITHOUT_MODEL", "🧠", "Sin modelo"], ["MIXED", "✨", "Yomu adapta la ayuda"]] },
  SYLLABLE_COUNT: { eyebrow: "Escucha y cuenta", title: "¿Cuántas sílabas?", description: "Escucha sin ver la palabra y cuenta del 1 al 4.", icon: "● ● ●", modes: [["COUNT", "🔊", "Audio e imagen como ayuda"]] }
} as const;

export default function ActivitySetup({ type, profile, categories }: { type: ActivityType; profile: Profile; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const detail = details[type];
  const [mode, setMode] = useState<string>(detail.modes[0][0]);
  const [count, setCount] = useState<5 | 10>(5);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  function start() {
    const params = new URLSearchParams({ profile: profile.id, type, mode, count: String(type === "NAME_TILES" ? 5 : count), requestKey: createClientUuid() });
    if (type === "SYLLABLE_COUNT" && category) params.set("category", category);
    if (type === "SYLLABLE_COUNT" && difficulty) params.set("difficulty", difficulty);
    router.push(`/jugar/actividad/sesion?${params}`);
  }

  return <main className="setup shell activity-setup">
    <Link className="brand" href={`/jugar?perfil=${profile.id}`}><span className="brand-mark">よ</span> Yomu</Link>
    <section className="activity-hero"><span className="activity-hero-icon" aria-hidden="true">{detail.icon}</span><div><p className="eyebrow">{detail.eyebrow}</p><h1 className="page-title">{detail.title}</h1><p>{detail.description}</p></div></section>
    <section className="setup-section"><h2>¿Cómo quieres practicar?</h2><div className="choice-grid">{detail.modes.map(([value, icon, label]) => <button key={value} className={`choice-card ${mode === value ? "selected" : ""}`} aria-pressed={mode === value} onClick={() => setMode(value)}><span className="activity-card-icon">{icon}</span><strong>{label}</strong></button>)}</div></section>
    {type !== "NAME_TILES" && <section className="setup-section"><h2>¿Cuántos retos?</h2><div className="pill-row">{([5, 10] as const).map((value) => <button className={`pill ${count === value ? "selected" : ""}`} aria-pressed={count === value} onClick={() => setCount(value)} key={value}>{value}</button>)}</div></section>}
    {type === "SYLLABLE_COUNT" && <section className="setup-section setup-filters"><div className="form-field"><label htmlFor="activity-category">Tema (opcional)</label><select id="activity-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todos</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="form-field"><label htmlFor="activity-difficulty">Nivel (opcional)</label><select id="activity-difficulty" className="select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="">Todos</option><option value="1">1 · Inicial</option><option value="2">2 · Medio</option><option value="3">3 · Reto</option></select></div></section>}
    {type === "NAME_TILES" && <p className="availability-card">Nombre configurado para esta práctica: <strong>{profile.practiceName}</strong></p>}
    <div className="setup-actions"><button className="primary-button" onClick={start}>¡Empezar! <span aria-hidden="true">→</span></button></div>
  </main>;
}
