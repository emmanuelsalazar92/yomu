"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function SimpleManager({
  title,
  kind,
  items
}: {
  title: string;
  kind: "profiles" | "categories";
  items: { id: string; name: string; detail: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body =
      kind === "profiles"
        ? { nickname: form.get("name"), avatar: form.get("detail") }
        : { name: form.get("name"), color: form.get("detail") };
    const response = await fetch(`/api/admin/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } else setError("No se pudo guardar.");
  }
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="admin-grid">
        <form className="panel admin-form" onSubmit={submit}>
          <h2>Agregar</h2>
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input className="input" id="name" name="name" required maxLength={60} />
          </div>
          <div className="form-field">
            <label htmlFor="detail">{kind === "profiles" ? "Avatar (emoji)" : "Color"}</label>
            <input
              className="input"
              id="detail"
              name="detail"
              defaultValue={kind === "profiles" ? "🌱" : "#B9DCCB"}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="admin-button">Guardar</button>
        </form>
        <section className="panel">
          <h2>Registrados</h2>
          {items.map((item) => (
            <p key={item.id}>
              <strong>{item.detail}</strong> {item.name}
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
