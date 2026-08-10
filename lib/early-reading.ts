import type { AnswerOutcome, DailyActivityType } from "@prisma/client";
import { consonantBase, graphemes, spanishUpper, vowelBase } from "@/lib/spanish";

const ONSET_CLUSTERS = new Set([
  "BL", "BR", "CH", "CL", "CR", "DR", "FL", "FR", "GL", "GR", "LL", "PL", "PR", "RR", "TR"
]);

function isVowel(letter: string) {
  return vowelBase(letter) !== null;
}

export function initialSound(word: string) {
  const first = graphemes(spanishUpper(word))[0] ?? "";
  return vowelBase(first) ?? consonantBase(first) ?? first;
}

export function syllabifySpanish(word: string): string[] {
  const letters = graphemes(spanishUpper(word));
  if (!letters.length) return [];
  const nuclei: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < letters.length; index += 1) {
    if (!isVowel(letters[index])) continue;
    const start = index;
    while (index + 1 < letters.length && isVowel(letters[index + 1])) index += 1;
    nuclei.push({ start, end: index });
  }
  if (nuclei.length <= 1) return [letters.join("")];

  const boundaries: number[] = [];
  for (let index = 0; index < nuclei.length - 1; index += 1) {
    const gapStart = nuclei[index].end + 1;
    const gapEnd = nuclei[index + 1].start;
    const consonants = letters.slice(gapStart, gapEnd);
    if (consonants.length <= 1) boundaries.push(gapStart);
    else if (consonants.length === 2) {
      boundaries.push(ONSET_CLUSTERS.has(consonants.join("")) ? gapStart : gapStart + 1);
    } else {
      const lastTwo = consonants.slice(-2).join("");
      boundaries.push(
        ONSET_CLUSTERS.has(lastTwo) ? gapEnd - 2 : Math.max(gapStart + 1, gapEnd - 1)
      );
    }
  }
  const result: string[] = [];
  let start = 0;
  for (const boundary of boundaries) {
    result.push(letters.slice(start, boundary).join(""));
    start = boundary;
  }
  result.push(letters.slice(start).join(""));
  return result.filter(Boolean);
}

export function isEarlySyllableWord(word: string) {
  const syllables = syllabifySpanish(word);
  return syllables.length >= 2 && syllables.length <= 4 && graphemes(word).length <= 10;
}

function stableRank(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableChoices(values: readonly string[], seed: string, count?: number) {
  const ordered = [...new Set(values)]
    .map((value) => ({ value, rank: stableRank(`${seed}:${value}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ value }) => value);
  return count === undefined ? ordered : ordered.slice(0, count);
}

export const DAILY_REWARDS = [
  { name: "Semilla curiosa", icon: "🌰" },
  { name: "Brote lector", icon: "🌱" },
  { name: "Hojas valientes", icon: "🌿" },
  { name: "Flor de palabras", icon: "🌼" },
  { name: "Árbol de cuentos", icon: "🌳" }
] as const;

export type SummaryTarget = {
  type: DailyActivityType;
  expectedPiece: string;
  outcome: AnswerOutcome | null;
};

export function buildAdultRecommendation(targets: readonly SummaryTarget[]) {
  const difficult = targets.filter((target) => target.outcome && target.outcome !== "CORRECT");
  const sounds = [
    ...new Set(
      difficult
        .filter((target) => target.type === "INITIAL_SOUND" || target.type === "TRACE_LETTER")
        .map((target) => target.expectedPiece)
    )
  ];
  const syllables = [
    ...new Set(
      difficult
        .filter((target) => target.type === "SYLLABLE_BUILD")
        .map((target) => target.expectedPiece)
    )
  ];
  if (!difficult.length)
    return "Hoy respondió con seguridad. Mañana conviene repetir la ruta y leer juntos una palabra conocida.";
  const parts = [
    sounds.length ? `el sonido ${sounds.slice(0, 3).join(", ")}` : "",
    syllables.length ? `las sílabas ${syllables.slice(0, 3).join(", ")}` : ""
  ].filter(Boolean);
  return `Practiquen ${parts.join(" y ")} con palabras cortas, sin pedir velocidad.`;
}
