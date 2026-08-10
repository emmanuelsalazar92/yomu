import { CONSONANT_OPTIONS, VOWEL_OPTIONS } from "@/lib/constants";

export type VowelBase = (typeof VOWEL_OPTIONS)[number];
export type Consonant = (typeof CONSONANT_OPTIONS)[number];
export type LetterTargetKind = "VOWEL" | "CONSONANT";

const VOWEL_FAMILIES: Record<string, VowelBase> = {
  A: "A",
  Á: "A",
  E: "E",
  É: "E",
  I: "I",
  Í: "I",
  O: "O",
  Ó: "O",
  U: "U",
  Ú: "U",
  Ü: "U"
};

export function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }
  return Array.from(value);
}

export function spanishUpper(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es");
}

export function normalizeForSearch(value: string): string {
  return spanishUpper(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .normalize("NFC");
}

export function vowelBase(letter: string): VowelBase | null {
  return VOWEL_FAMILIES[spanishUpper(letter)] ?? null;
}

export function detectVowels(word: string) {
  return graphemes(spanishUpper(word)).flatMap((letter, index) => {
    const base = vowelBase(letter);
    return base ? [{ index, letter, base }] : [];
  });
}

const CONSONANTS = new Set<string>(CONSONANT_OPTIONS);

export function consonantBase(letter: string): Consonant | null {
  const normalized = spanishUpper(letter);
  return CONSONANTS.has(normalized) ? (normalized as Consonant) : null;
}

export function detectConsonants(word: string) {
  return graphemes(spanishUpper(word)).flatMap((letter, index) => {
    const base = consonantBase(letter);
    return base ? [{ index, letter, base }] : [];
  });
}

export function detectTargets(word: string, kind: LetterTargetKind) {
  return kind === "VOWEL" ? detectVowels(word) : detectConsonants(word);
}

export function maskWord(word: string, hiddenPositions: number[]): string {
  const hidden = new Set(hiddenPositions);
  return graphemes(spanishUpper(word))
    .map((letter, index) => (hidden.has(index) ? "_" : letter))
    .join("");
}

export function answerMatches(expected: string, selected: string): boolean {
  return vowelBase(expected) !== null && vowelBase(expected) === vowelBase(selected);
}

export function targetMatches(expected: string, selected: string, kind: LetterTargetKind): boolean {
  return kind === "VOWEL"
    ? answerMatches(expected, selected)
    : consonantBase(expected) !== null && consonantBase(expected) === consonantBase(selected);
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function consonantChoices(
  correct: string,
  active: readonly string[],
  seed: string
): string[] {
  const expected = consonantBase(correct);
  if (!expected) return [];
  const unique = [
    ...new Set(active.map((item) => consonantBase(item)).filter(Boolean))
  ] as Consonant[];
  const distractors = unique
    .filter((item) => item !== expected)
    .map((item) => ({ item, rank: hashSeed(`${seed}:${item}`) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 2)
    .map(({ item }) => item);
  if (distractors.length < 2) return [];
  return [expected, ...distractors]
    .map((item) => ({ item, rank: hashSeed(`${seed}:order:${item}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

export function firstGraphemeIsVowel(word: string): boolean {
  return vowelBase(graphemes(spanishUpper(word))[0] ?? "") !== null;
}
