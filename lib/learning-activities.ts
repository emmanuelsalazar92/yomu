import { graphemes, spanishUpper } from "@/lib/spanish";

export const SPANISH_ALPHABET = graphemes("ABCDEFGHIJKLMNÑOPQRSTUVWXYZ");
export const ALL_VOWELS = ["A", "E", "I", "O", "U"] as const;
export const NAME_MAX_GRAPHEMES = 30;
export const NAME_WITHOUT_MODEL_MIN_CORRECT = 3;
export const NAME_WITHOUT_MODEL_MIN_ACCURACY = 0.8;

export type CaseDirection = "UPPER_TO_LOWER" | "LOWER_TO_UPPER";
export type NameMode = "WITH_MODEL" | "WITHOUT_MODEL";

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function stableOrder<T>(items: readonly T[], seed: string, key: (item: T) => string): T[] {
  return [...items].sort(
    (a, b) => hashSeed(`${seed}:${key(a)}`) - hashSeed(`${seed}:${key(b)}`)
  );
}

export function spanishLower(value: string): string {
  return value.toLocaleLowerCase("es");
}

export function caseCandidates(activeConsonants: readonly string[]): string[] {
  return [
    ...new Set(
      [...ALL_VOWELS, ...activeConsonants]
        .map((letter) => spanishUpper(letter))
        .filter((letter) => SPANISH_ALPHABET.includes(letter))
    )
  ];
}

export function caseOptions(
  correctUpper: string,
  direction: CaseDirection,
  candidates: readonly string[],
  seed: string
): string[] {
  const expected = spanishUpper(correctUpper);
  const distractors = stableOrder(
    [...new Set(candidates.map(spanishUpper))].filter((letter) => letter !== expected),
    `${seed}:distractors`,
    (letter) => letter
  ).slice(0, 2);
  if (distractors.length < 2) return [];
  return stableOrder([expected, ...distractors], `${seed}:options`, (letter) => letter).map(
    (letter) => (direction === "UPPER_TO_LOWER" ? spanishLower(letter) : letter)
  );
}

export function normalizePracticeName(value: string): string {
  return spanishUpper(value).replace(/\s*-\s*/g, "-");
}

export function validatePracticeName(value: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizePracticeName(value);
  const length = graphemes(normalized).length;
  if (!normalized) return { valid: false, normalized, error: "Escribe un nombre para practicar." };
  if (length > NAME_MAX_GRAPHEMES) {
    return { valid: false, normalized, error: `Usa como máximo ${NAME_MAX_GRAPHEMES} caracteres.` };
  }
  if (!/^[A-ZÁÉÍÓÚÜÑ]+(?:[ -][A-ZÁÉÍÓÚÜÑ]+)*$/u.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Usa únicamente letras, tildes, Ñ, espacios o guiones."
    };
  }
  return { valid: true, normalized };
}

export type NameTile = { id: string; value: string };

export function buildNameTiles(value: string, seed: string): {
  graphemes: string[];
  fixed: Array<{ index: number; value: string }>;
  tiles: NameTile[];
  answerTileIds: string[];
} {
  const pieces = graphemes(normalizePracticeName(value));
  const movable = pieces.flatMap((piece, index) =>
    piece === " " || piece === "-" ? [] : [{ id: `${index}-${hashSeed(`${seed}:${index}`)}`, value: piece }]
  );
  const fixed = pieces.flatMap((piece, index) =>
    piece === " " || piece === "-" ? [{ index, value: piece }] : []
  );
  return {
    graphemes: pieces,
    fixed,
    tiles: stableOrder(movable, `${seed}:tiles`, (tile) => tile.id),
    answerTileIds: movable.map((tile) => tile.id)
  };
}

export function nameTileAnswerMatches(expectedIds: readonly string[], selectedIds: readonly string[]) {
  return expectedIds.length === selectedIds.length && expectedIds.every((id, index) => id === selectedIds[index]);
}

export function parseSyllables(value: string | readonly string[]): string[] {
  const pieces = Array.isArray(value) ? value : String(value).split("-");
  return pieces.map((piece) => spanishUpper(piece)).filter(Boolean);
}

export function validateSyllables(word: string, value: string | readonly string[]) {
  const syllables = parseSyllables(value);
  const normalizedWord = spanishUpper(word).normalize("NFC");
  const validCount = syllables.length >= 1 && syllables.length <= 4;
  const validJoin = syllables.join("").normalize("NFC") === normalizedWord;
  return {
    syllables,
    eligible: validCount && validJoin,
    error: !validCount
      ? "La palabra debe tener entre 1 y 4 sílabas."
      : !validJoin
        ? "Las sílabas unidas deben formar exactamente la palabra."
        : undefined
  };
}

export function progressState(attempts: number, correct: number, distinctSessions: number) {
  const accuracy = attempts ? correct / attempts : 0;
  if (attempts >= 5 && distinctSessions >= 2 && accuracy >= 0.8) return "LEARNED" as const;
  if (attempts >= 3 && accuracy >= 0.65) return "ALMOST_LEARNED" as const;
  if (attempts > 0) return "LEARNING" as const;
  return "NEW" as const;
}
