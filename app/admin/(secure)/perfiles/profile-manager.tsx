"use client";

import { useState } from "react";
import { validatePracticeName } from "@/lib/learning-activities";

type Profile = { id: string; nickname: string; avatar: string | null; practiceName: string | null; nameActivityEnabled: boolean };

export default function ProfileManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🌱");
  const [practiceName, setPracticeName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const preview = practiceName ? validatePracticeName(practiceName) : null;

  function reset() { setEditing(null); setNickname(""); setAvatar("🌱"); setPracticeName(""); setEnabled(false); setError(""); }
  function begin(profile: Profile) {
    setEditing(profile); setNickname(profile.nickname); setAvatar(profile.avatar || "🌱");
    setPracticeName(profile.practiceName || ""); setEnabled(profile.nameActivityEnabled); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch(editing ? `/api/admin/profiles/${editing.id}` : "/api/admin/profiles", {
      method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, avatar, practiceName: practiceName || null, nameActivityEnabled: enabled })
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error || "No se pudo guardar.");
    setProfiles((current) => editing ? current.map((item) => item.id === payload.id ? payload : item) : [payload, ...current]);
    reset();
  }

  return <>
    <div className="admin-toolbar"><div><p className="eyebrow">Administración</p><h1>Perfiles infantiles</h1></div></div>
    <div className="admin-grid">
      <form className="panel admin-form" onSubmit={submit}>
        <h2>{editing ? "Editar perfil" : "Agregar perfil"}</h2>
        <div className="form-field"><label htmlFor="nickname">Apodo visible</label><input className="input" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={40} /></div>
        <div className="form-field"><label htmlFor="avatar">Avatar (emoji)</label><input className="input" id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} maxLength={8} /></div>
        <div className="form-field"><label htmlFor="practiceName">Nombre para practicar</label><input className="input" id="practiceName" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} maxLength={30} placeholder="Ej. MARÍA-JOSÉ" /><small>Dato educativo opcional; no tiene que ser el nombre legal.</small><button type="button" className="secondary-button" onClick={() => setPracticeName(nickname)}>Copiar apodo</button></div>
        {preview && <p className={preview.valid ? "success-text" : "error-text"}>Vista previa: <strong>{preview.normalized}</strong>{preview.error ? ` · ${preview.error}` : ""}</p>}
        <label className="check-row"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Activar “Construye tu nombre”</label>
        {error && <p className="error-text">{error}</p>}
        <div className="button-row"><button className="admin-button">Guardar</button>{editing && <button type="button" className="secondary-button" onClick={reset}>Cancelar</button>}</div>
      </form>
      <section className="panel"><h2>Registrados</h2><div className="admin-list">{profiles.map((profile) => <article key={profile.id} className="admin-list-item"><div><strong>{profile.avatar || "🌱"} {profile.nickname}</strong><p>{profile.practiceName ? `Práctica: ${profile.practiceName}` : "Sin nombre de práctica"} · {profile.nameActivityEnabled ? "Actividad activa" : "Actividad desactivada"}</p></div><button className="admin-button" type="button" onClick={() => begin(profile)}>Editar</button></article>)}</div></section>
    </div>
  </>;
}
