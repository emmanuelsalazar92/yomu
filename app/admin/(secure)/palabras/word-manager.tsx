"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { detectVowels, graphemes, maskWord, spanishUpper } from "@/lib/spanish";

type Category = { id: string; name: string };
type WordItem = {
  id: string;
  text: string;
  difficulty: number;
  active: boolean;
  category: { name: string };
  configurations: { id: string; type: string; hiddenPositions: number[] }[];
};

const types = [
  ["ONE_VOWEL", "Una vocal"],
  ["ALL_VOWELS", "Todas las vocales"],
  ["INITIAL_VOWEL", "Vocal inicial"]
] as const;

function MediaUpload({
  id,
  name,
  label,
  accept,
  fileName,
  setFileName,
  inputRef
}: {
  id: string;
  name: string;
  label: string;
  accept: string;
  fileName: string;
  setFileName: (name: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName("");
  }
  return (
    <div className="form-field upload-field">
      <span className="upload-label">{label}</span>
      <input
        className="visually-hidden-file"
        id={id}
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        onChange={(event) => setFileName(event.target.files?.[0]?.name || "")}
      />
      <div className="upload-control">
        <label className="upload-button" htmlFor={id}>
          Seleccionar {name === "image" ? "imagen" : "audio"}
        </label>
        <span className="upload-filename" title={fileName || "Ningún archivo seleccionado"}>
          {fileName || "Ningún archivo"}
        </span>
        {fileName && (
          <button
            className="upload-clear"
            type="button"
            onClick={clear}
            aria-label={`Quitar ${label}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default function WordManager({
  initialWords,
  categories
}: {
  initialWords: WordItem[];
  categories: Category[];
}) {
  const [words, setWords] = useState(initialWords);
  const [text, setText] = useState("");
  const [hidden, setHidden] = useState<number[]>([]);
  const [enabledTypes, setEnabledTypes] = useState(["ONE_VOWEL", "ALL_VOWELS"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageName, setImageName] = useState("");
  const [audioName, setAudioName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WordItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const deleteBusyRef = useRef(false);
  const upper = spanishUpper(text);
  const vowels = useMemo(() => detectVowels(upper), [upper]);

  function togglePosition(position: number) {
    setHidden((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position].sort((a, b) => a - b)
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    const form = new FormData(formElement);
    form.set("text", upper);
    form.set("hiddenPositions", JSON.stringify(hidden));
    form.set("exerciseTypes", JSON.stringify(enabledTypes));
    const response = await fetch("/api/admin/words", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "No se pudo guardar.");
      setBusy(false);
      return;
    }
    setWords((current) => [payload, ...current]);
    setText("");
    setHidden([]);
    setImageName("");
    setAudioName("");
    setNotice(`“${payload.text}” se guardó en la biblioteca.`);
    setBusy(false);
    formElement.reset();
  }

  async function toggleWord(id: string, active: boolean) {
    const response = await fetch(`/api/admin/words/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active })
    });
    if (response.ok) {
      setWords((current) =>
        current.map((word) => (word.id === id ? { ...word, active: !active } : word))
      );
    } else {
      setNotice("No se pudo cambiar el estado de la palabra.");
    }
  }

  async function deleteWord() {
    if (!deleteTarget || deleteBusyRef.current) return;
    deleteBusyRef.current = true;
    setDeleteBusy(true);
    setDeleteError("");
    const response = await fetch(`/api/admin/words/${deleteTarget.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDeleteError(payload.error || "No se pudo eliminar la palabra.");
      deleteBusyRef.current = false;
      setDeleteBusy(false);
      return;
    }
    setWords((current) => current.filter((word) => word.id !== deleteTarget.id));
    setNotice(`“${deleteTarget.text}” se eliminó de la biblioteca.`);
    setDeleteTarget(null);
    deleteBusyRef.current = false;
    setDeleteBusy(false);
  }

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Biblioteca</p>
          <h1>Palabras</h1>
        </div>
      </div>
      <div className="wizard">
        <form className="panel admin-form word-form" onSubmit={submit}>
          <h2>Nueva palabra</h2>
          <div className="form-field">
            <label htmlFor="word">1. Escribe la palabra</label>
            <input
              className="input"
              id="word"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setHidden([]);
              }}
              maxLength={40}
              required
              placeholder="MANZANA"
            />
          </div>
          <div>
            <strong>2. Elige las vocales que pueden ocultarse</strong>
            <div className="letter-picker" style={{ marginTop: 10 }}>
              {graphemes(upper).map((letter, index) => {
                const isVowel = vowels.some((item) => item.index === index);
                return (
                  <button
                    type="button"
                    disabled={!isVowel}
                    className={`letter-choice ${isVowel ? "vowel" : ""} ${hidden.includes(index) ? "selected" : ""}`}
                    aria-pressed={hidden.includes(index)}
                    onClick={() => togglePosition(index)}
                    key={`${letter}-${index}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p className="help-text">
              Yomu detectó {vowels.length} vocal{vowels.length === 1 ? "" : "es"}. Puedes corregir
              la selección.
            </p>
          </div>
          <div>
            <strong>3. Configura los ejercicios</strong>
            <div className="check-row" style={{ marginTop: 10 }}>
              {types.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={enabledTypes.includes(value)}
                    onChange={() =>
                      setEnabledTypes((current) =>
                        current.includes(value)
                          ? current.filter((item) => item !== value)
                          : [...current, value]
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="category">Categoría</label>
              <select className="select" id="category" name="categoryId" required>
                <option value="">Selecciona…</option>
                {categories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="difficulty">Nivel</label>
              <select className="select" id="difficulty" name="difficulty">
                <option value="1">1 · Inicial</option>
                <option value="2">2 · Medio</option>
                <option value="3">3 · Reto</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <MediaUpload
              id="image"
              name="image"
              label="Imagen (opcional)"
              accept="image/jpeg,image/png,image/webp"
              fileName={imageName}
              setFileName={setImageName}
              inputRef={imageRef}
            />
            <MediaUpload
              id="audio"
              name="audio"
              label="Audio (opcional)"
              accept="audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4"
              fileName={audioName}
              setFileName={setAudioName}
              inputRef={audioRef}
            />
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button
            className="admin-button word-submit"
            disabled={busy || !upper || !hidden.length || !enabledTypes.length}
          >
            {busy ? "Guardando…" : "Guardar palabra"}
          </button>
        </form>
        <section className="panel preview-panel">
          <p className="eyebrow">Vista previa</p>
          <h2
            style={{
              fontSize: "clamp(2rem,5vw,4rem)",
              letterSpacing: ".08em",
              overflowWrap: "anywhere"
            }}
          >
            {hidden.length ? maskWord(upper, hidden) : upper || "_ _ _"}
          </h2>
          <p className="help-text">
            Al revelar la respuesta se mostrará <strong>{upper || "LA PALABRA"}</strong>, incluidas
            sus tildes y diéresis.
          </p>
        </section>
      </div>
      <p className="sr-status" role="status" aria-live="polite">
        {notice}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Palabra</th>
              <th>Categoría</th>
              <th>Nivel</th>
              <th>Configuraciones</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {words.map((word) => (
              <tr key={word.id}>
                <td>
                  <strong>{word.text}</strong>
                </td>
                <td>{word.category.name}</td>
                <td>{word.difficulty}</td>
                <td>{word.configurations.length}</td>
                <td>
                  <span className="badge">{word.active ? "Activa" : "Inactiva"}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="admin-button compact-button"
                      onClick={() => void toggleWord(word.id, word.active)}
                    >
                      {word.active ? "Pausar" : "Activar"}
                    </button>
                    <button
                      className="admin-button compact-button destructive-button"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget(word);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteTarget && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <p className="eyebrow">Eliminar palabra</p>
            <h2 id="delete-title">¿Deseas eliminar “{deleteTarget.text}”?</h2>
            <p id="delete-description">
              Dejará de estar disponible en los juegos y desaparecerá de la biblioteca. Los intentos
              y puntajes históricos se conservarán.
            </p>
            {deleteError && (
              <p className="error-text" role="alert">
                {deleteError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="admin-button"
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
              <button
                className="admin-button destructive-button"
                type="button"
                disabled={deleteBusy}
                onClick={() => void deleteWord()}
                autoFocus
              >
                {deleteBusy ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
