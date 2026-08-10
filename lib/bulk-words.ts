import type { ExerciseType } from "@prisma/client";
import { detectConsonants, detectVowels, spanishUpper } from "@/lib/spanish";
import { buildWordConfigurations } from "@/lib/word-configurations";

export const BULK_WORD_LIMIT = 100;

export function parseBulkWordText(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\r\n,;]+/)
    .map((item) => spanishUpper(item.trim().replace(/\s+/g, " ")))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

export function prepareBulkWord(text: string, exerciseTypes: ExerciseType[]) {
  const normalizedText = spanishUpper(text.trim().replace(/\s+/g, " "));
  if (!normalizedText) throw new Error("La palabra está vacía");
  if (normalizedText.length > 40) throw new Error("Supera el máximo de 40 caracteres");

  const vowelPositions = detectVowels(normalizedText).map(({ index }) => index);
  const consonantPositions = detectConsonants(normalizedText).map(({ index }) => index);
  return {
    text: normalizedText,
    configurations: buildWordConfigurations({
      text: normalizedText,
      vowelPositions,
      consonantPositions,
      exerciseTypes
    })
  };
}
