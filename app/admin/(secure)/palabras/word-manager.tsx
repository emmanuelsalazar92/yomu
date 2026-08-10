"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { detectConsonants, detectVowels, graphemes, maskWord, spanishUpper } from "@/lib/spanish";
import { useWordSpeaker } from "@/lib/use-word-speaker";

type Category = { id: string; name: string };
type WordItem = {
  id: string;
  text: string;
  difficulty: number;
  active: boolean;
  imagePath?: string | null;
  audioPath?: string | null;
  category: Category;
  configurations: { id: string; type: string; hiddenPositions: number[]; active?: boolean }[];
};

const vowelTypes = [
  ["ONE_VOWEL", "Una vocal"],
  ["ALL_VOWELS", "Todas las vocales"],
  ["INITIAL_VOWEL", "Vocal inicial"]
] as const;

function uniquePositions(configurations: WordItem["configurations"], consonants: boolean) {
  return [
    ...new Set(
      configurations
        .filter(
          (item) => item.active !== false && (item.type === "SINGLE_CONSONANT") === consonants
        )
        .flatMap((item) => item.hiddenPositions)
    )
  ].sort((a, b) => a - b);
}

export default function WordManager({
  initialWords,
  categories
}: {
  initialWords: WordItem[];
  categories: Category[];
}) {
  const speaker = useWordSpeaker();
  const { state: playbackState, speakWord, stopSpeaking, isSpeechAvailable } = speaker;
  const [words, setWords] = useState(initialWords);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [vowelHidden, setVowelHidden] = useState<number[]>([]);
  const [consonantHidden, setConsonantHidden] = useState<number[]>([]);
  const [group, setGroup] = useState<"VOWEL" | "CONSONANT">("VOWEL");
  const [enabledTypes, setEnabledTypes] = useState<string[]>(["ONE_VOWEL", "ALL_VOWELS"]);
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("1");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageName, setImageName] = useState("");
  const [audioName, setAudioName] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const editing = words.find((word) => word.id === editingId) ?? null;
  const upper = spanishUpper(text);
  const vowels = useMemo(() => detectVowels(upper), [upper]);
  const consonants = useMemo(() => detectConsonants(upper), [upper]);
  const vowelSet = new Set(vowels.map(({ index }) => index));
  const consonantSet = new Set(consonants.map(({ index }) => index));

  useEffect(
    () => () => {
      if (audioPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(audioPreviewUrl);
    },
    [audioPreviewUrl]
  );

  function resetForm() {
    speaker.stopSpeaking();
    if (audioPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(audioPreviewUrl);
    setEditingId(null);
    setText("");
    setVowelHidden([]);
    setConsonantHidden([]);
    setEnabledTypes(["ONE_VOWEL", "ALL_VOWELS"]);
    setCategoryId("");
    setDifficulty("1");
    setImageName("");
    setAudioName("");
    setAudioPreviewUrl(null);
    setRemoveAudio(false);
    setError("");
    if (imageRef.current) imageRef.current.value = "";
    if (audioRef.current) audioRef.current.value = "";
  }

  function edit(word: WordItem) {
    const activeConfigurations = word.configurations.filter((item) => item.active !== false);
    setEditingId(word.id);
    setText(word.text);
    setVowelHidden(uniquePositions(activeConfigurations, false));
    setConsonantHidden(uniquePositions(activeConfigurations, true));
    setEnabledTypes([...new Set(activeConfigurations.map((item) => item.type))]);
    setCategoryId(word.category.id);
    setDifficulty(String(word.difficulty));
    setAudioPreviewUrl(word.audioPath ? `/api/media/${word.audioPath}` : null);
    setRemoveAudio(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateText(value: string) {
    if (
      editingId &&
      spanishUpper(value) !== upper &&
      (vowelHidden.length || consonantHidden.length)
    ) {
      if (!window.confirm("Cambiar la palabra descartará las posiciones configuradas. ¿Continuar?"))
        return;
    }
    setText(value);
    setVowelHidden([]);
    setConsonantHidden([]);
  }

  function togglePosition(position: number) {
    const setter = group === "VOWEL" ? setVowelHidden : setConsonantHidden;
    setter((current) =>
      current.includes(position)
        ? current.filter((item) => item !== position)
        : [...current, position].sort((a, b) => a - b)
    );
  }

  function validateAudio(file: File | null) {
    if (!file) {
      setAudioPreviewUrl(null);
      return true;
    }
    if (file.type !== "audio/mpeg" || !file.name.toLowerCase().endsWith(".mp3")) {
      setError("El audio debe ser un archivo MP3 (audio/mpeg).");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("El audio no puede superar 5 MB.");
      return false;
    }
    if (audioPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setRemoveAudio(false);
    setError("");
    return true;
  }

  function toggleType(value: string) {
    setEnabledTypes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("text", upper);
    form.set("categoryId", categoryId);
    form.set("difficulty", difficulty);
    form.set("vowelPositions", JSON.stringify(vowelHidden));
    form.set("consonantPositions", JSON.stringify(consonantHidden));
    form.set("exerciseTypes", JSON.stringify(enabledTypes));
    form.set("removeAudio", String(removeAudio));
    const response = await fetch(editingId ? `/api/admin/words/${editingId}` : "/api/admin/words", {
      method: editingId ? "PATCH" : "POST",
      body: form
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "No se pudo guardar.");
      setBusy(false);
      return;
    }
    setWords((current) =>
      editingId
        ? current.map((word) => (word.id === editingId ? payload : word))
        : [payload, ...current]
    );
    setNotice(`“${payload.text}” se guardó en la biblioteca.`);
    setBusy(false);
    resetForm();
  }

  async function toggleWord(word: WordItem) {
    const response = await fetch(`/api/admin/words/${word.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !word.active })
    });
    if (response.ok)
      setWords((current) =>
        current.map((item) => (item.id === word.id ? { ...item, active: !item.active } : item))
      );
  }

  async function deleteWord(word: WordItem) {
    if (!window.confirm(`¿Eliminar “${word.text}”? Los intentos históricos se conservarán.`))
      return;
    const response = await fetch(`/api/admin/words/${word.id}`, { method: "DELETE" });
    if (response.ok) setWords((current) => current.filter((item) => item.id !== word.id));
  }

  function listen(word: WordItem) {
    void speaker.play(word.text, word.audioPath ? `/api/media/${word.audioPath}` : null);
  }

  const hasConfiguration =
    (vowelHidden.length > 0 && enabledTypes.some((type) => type !== "SINGLE_CONSONANT")) ||
    (consonantHidden.length > 0 && enabledTypes.includes("SINGLE_CONSONANT"));

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
          <h2>{editingId ? "Editar palabra" : "Nueva palabra"}</h2>
          <div className="form-field">
            <label htmlFor="word">1. Escribe la palabra</label>
            <input
              className="input"
              id="word"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              maxLength={40}
              required
              placeholder="MANZANA"
            />
          </div>
          <div>
            <strong>2. Elige las letras que pueden ocultarse</strong>
            <div className="choice-grid" style={{ marginTop: 10 }}>
              <button
                type="button"
                className={`choice-card ${group === "VOWEL" ? "selected" : ""}`}
                onClick={() => setGroup("VOWEL")}
              >
                <strong>Vocales</strong>
                <span>{vowelHidden.length} seleccionadas</span>
              </button>
              <button
                type="button"
                className={`choice-card ${group === "CONSONANT" ? "selected" : ""}`}
                onClick={() => setGroup("CONSONANT")}
              >
                <strong>Consonantes</strong>
                <span>{consonantHidden.length} seleccionadas</span>
              </button>
            </div>
            <div className="letter-picker" style={{ marginTop: 10 }}>
              {graphemes(upper).map((letter, index) => {
                const selectable =
                  group === "VOWEL" ? vowelSet.has(index) : consonantSet.has(index);
                const selected = (group === "VOWEL" ? vowelHidden : consonantHidden).includes(
                  index
                );
                return (
                  <button
                    type="button"
                    disabled={!selectable}
                    className={`letter-choice ${group === "VOWEL" ? "vowel" : "consonant"} ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => togglePosition(index)}
                    key={`${letter}-${index}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p className="help-text">
              Detectadas: {vowels.length} vocales y {consonants.length} consonantes.
            </p>
          </div>
          <div>
            <strong>3. Configura los ejercicios</strong>
            <div className="check-row" style={{ marginTop: 10 }}>
              {vowelTypes.map(([value, label]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={enabledTypes.includes(value)}
                    onChange={() => toggleType(value)}
                  />
                  {label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={enabledTypes.includes("SINGLE_CONSONANT")}
                  disabled={!consonantHidden.length}
                  onChange={() => toggleType("SINGLE_CONSONANT")}
                />
                Una consonante
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="category">Categoría</label>
              <select
                className="select"
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
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
              <select
                className="select"
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="1">1 · Inicial</option>
                <option value="2">2 · Medio</option>
                <option value="3">3 · Reto</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="image">Imagen (opcional)</label>
              <input
                ref={imageRef}
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImageName(event.target.files?.[0]?.name || "")}
              />
              <span className="help-text">
                {imageName || (editingId ? "Conservar imagen actual" : "Sin imagen")}
              </span>
            </div>
            <div className="form-field">
              <label htmlFor="audio">MP3 personalizado (opcional)</label>
              <input
                ref={audioRef}
                id="audio"
                name="audio"
                type="file"
                accept="audio/mpeg,.mp3"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!validateAudio(file)) {
                    event.currentTarget.value = "";
                    setAudioName("");
                    return;
                  }
                  setAudioName(file?.name || "");
                }}
              />
              <span className="help-text">
                {audioName || (editingId ? "Conservar audio actual" : "Usará voz automática")}
              </span>
            </div>
          </div>
          <p className="help-text">
            Si subes un MP3 de hasta 5 MB, Yomu lo utilizará en lugar de la voz automática.
          </p>
          {editing?.audioPath && !audioName && (
            <label className="check-row audio-remove-option">
              <input
                type="checkbox"
                checked={removeAudio}
                onChange={(event) => {
                  setRemoveAudio(event.target.checked);
                  if (event.target.checked) stopSpeaking();
                }}
              />
              Eliminar el MP3 almacenado y volver a voz automática
            </label>
          )}
          <div className="voice-test-row">
            <button
              className="admin-button compact-button"
              type="button"
              disabled={!upper || !isSpeechAvailable()}
              onClick={() =>
                void speakWord({ text: upper }).catch(() =>
                  setError("La voz automática no está disponible.")
                )
              }
            >
              Probar voz automática
            </button>
            {audioPreviewUrl && !removeAudio && (
              <button
                className="admin-button compact-button"
                type="button"
                onClick={() =>
                  void speakWord({ text: upper, customAudioUrl: audioPreviewUrl }).catch(() =>
                    setError(
                      "No se pudo reproducir el MP3; durante el juego se intentará la voz automática."
                    )
                  )
                }
              >
                Reproducir MP3
              </button>
            )}
            <span className="audio-source-badge">
              {audioPreviewUrl && !removeAudio ? "Audio personalizado" : "Voz automática"}
              {playbackState === "playing" ? " · Reproduciendo" : ""}
            </span>
          </div>
          {!isSpeechAvailable() && (
            <p className="help-text">
              La voz automática no está disponible en este dispositivo. Puedes subir un MP3
              personalizado.
            </p>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="table-actions">
            <button
              className="admin-button word-submit"
              disabled={busy || !upper || !hasConfiguration || !categoryId}
            >
              {busy ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar palabra"}
            </button>
            {editingId && (
              <button className="admin-button" type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
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
            {(group === "VOWEL" ? vowelHidden : consonantHidden).length
              ? maskWord(upper, group === "VOWEL" ? vowelHidden : consonantHidden)
              : upper || "_ _ _"}
          </h2>
          {consonantHidden.length > 0 && (
            <div>
              <strong>Una consonante</strong>
              {consonantHidden.map((position) => (
                <p key={position} className="help-text">
                  {maskWord(upper, [position])}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className="sr-status" role="status">
        {notice}
      </p>
      <label className="volume-control" style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        Volumen de reproducción
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={speaker.volume}
          onChange={(event) => speaker.setVolume(Number(event.target.value))}
        />
      </label>
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
                  <br />
                  <button
                    type="button"
                    className="link-button"
                    aria-label={`Escuchar ${word.text}`}
                    onClick={() => listen(word)}
                  >
                    🔊 {word.audioPath ? "Audio personalizado" : "Voz automática"}
                  </button>
                </td>
                <td>{word.category.name}</td>
                <td>{word.difficulty}</td>
                <td>{word.configurations.filter((item) => item.active !== false).length}</td>
                <td>
                  <span className="badge">{word.active ? "Activa" : "Inactiva"}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="admin-button compact-button" onClick={() => edit(word)}>
                      Editar
                    </button>
                    <button
                      className="admin-button compact-button"
                      onClick={() => void toggleWord(word)}
                    >
                      {word.active ? "Pausar" : "Activar"}
                    </button>
                    <button
                      className="admin-button compact-button destructive-button"
                      onClick={() => void deleteWord(word)}
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
    </>
  );
}
