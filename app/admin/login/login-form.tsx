"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form))
    });
    if (response.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError("No pudimos verificar esos datos.");
      setBusy(false);
    }
  }
  return (
    <form className="admin-form" style={{ marginTop: 26 }} onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="email">Correo</label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="password">Contraseña</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <button className="admin-button" disabled={busy}>
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
