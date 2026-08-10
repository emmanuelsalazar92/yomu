import { VOWEL_OPTIONS } from "@/lib/constants";

export type VowelBase = (typeof VOWEL_OPTIONS)[number];

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

export function maskWord(word: string, hiddenPositions: number[]): string {
  const hidden = new Set(hiddenPositions);
  return graphemes(spanishUpper(word))
    .map((letter, index) => (hidden.has(index) ? "_" : letter))
    .join("");
}

export function answerMatches(expected: string, selected: string): boolean {
  return vowelBase(expected) !== null && vowelBase(expected) === vowelBase(selected);
}

export function firstGraphemeIsVowel(word: string): boolean {
  return vowelBase(graphemes(spanishUpper(word))[0] ?? "") !== null;
}
