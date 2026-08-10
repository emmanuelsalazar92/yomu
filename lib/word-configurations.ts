import type { ExerciseType } from "@prisma/client";
import { detectConsonants, detectVowels, firstGraphemeIsVowel } from "@/lib/spanish";

export type WordConfigurationInput = {
  text: string;
  vowelPositions: number[];
  consonantPositions: number[];
  exerciseTypes: ExerciseType[];
};

export function buildWordConfigurations(input: WordConfigurationInput) {
  const vowelSet = new Set(detectVowels(input.text).map(({ index }) => index));
  const consonantSet = new Set(detectConsonants(input.text).map(({ index }) => index));
  if (input.vowelPositions.some((position) => !vowelSet.has(position)))
    throw new Error("Solo se pueden ocultar vocales en el grupo de vocales");
  if (input.consonantPositions.some((position) => !consonantSet.has(position)))
    throw new Error("Solo se pueden ocultar consonantes en el grupo de consonantes");

  const configurations: { type: ExerciseType; hiddenPositions: number[] }[] = [];
  if (input.exerciseTypes.includes("ONE_VOWEL"))
    input.vowelPositions.forEach((position) =>
      configurations.push({ type: "ONE_VOWEL", hiddenPositions: [position] })
    );
  if (input.exerciseTypes.includes("ALL_VOWELS") && input.vowelPositions.length)
    configurations.push({ type: "ALL_VOWELS", hiddenPositions: input.vowelPositions });
  if (
    input.exerciseTypes.includes("INITIAL_VOWEL") &&
    firstGraphemeIsVowel(input.text) &&
    input.vowelPositions.includes(0)
  )
    configurations.push({ type: "INITIAL_VOWEL", hiddenPositions: [0] });
  if (input.exerciseTypes.includes("SINGLE_CONSONANT"))
    input.consonantPositions.forEach((position) =>
      configurations.push({ type: "SINGLE_CONSONANT", hiddenPositions: [position] })
    );
  if (!configurations.length) throw new Error("No hay configuraciones elegibles");
  return configurations;
}
