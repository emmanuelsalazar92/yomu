"use client";
import { useState } from "react";
export default function PasswordForm() {
  const [msg, setMsg] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    setMsg(
      response.ok ? "Contraseña actualizada." : "Revisa la contraseña actual y vuelve a intentar."
    );
    if (response.ok) (event.target as HTMLFormElement).reset();
  }
  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="form-field">
        <label>Contraseña actual</label>
        <input className="input" type="password" name="currentPassword" minLength={8} required />
      </div>
      <div className="form-field">
        <label>Nueva contraseña</label>
        <input className="input" type="password" name="newPassword" minLength={12} required />
      </div>
      {msg && <p aria-live="polite">{msg}</p>}
      <button className="admin-button">Actualizar</button>
    </form>
  );
}
