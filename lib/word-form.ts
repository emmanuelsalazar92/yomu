import { z } from "zod";
import { detectVowels, firstGraphemeIsVowel, spanishUpper } from "@/lib/spanish";

export const wordSchema = z.object({
  text: z.string().min(1).max(40),
  categoryId: z.uuid(),
  difficulty: z.coerce.number().int().min(1).max(5),
  hiddenPositions: z.array(z.number().int().min(0)).min(1),
  exerciseTypes: z.array(z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL"])).min(1)
});

export function parseWordForm(form: FormData) {
  return wordSchema.parse({
    text: form.get("text"),
    categoryId: form.get("categoryId"),
    difficulty: form.get("difficulty") || 1,
    hiddenPositions: JSON.parse(String(form.get("hiddenPositions") || "[]")),
    exerciseTypes: JSON.parse(String(form.get("exerciseTypes") || "[]"))
  });
}

export function buildWordConfigurations(input: z.infer<typeof wordSchema>) {
  const text = spanishUpper(input.text);
  const validPositions = new Set(detectVowels(text).map((item) => item.index));
  if (input.hiddenPositions.some((position) => !validPositions.has(position)))
    throw new Error("Solo se pueden ocultar vocales");
  const configurations: {
    type: "ONE_VOWEL" | "ALL_VOWELS" | "INITIAL_VOWEL";
    hiddenPositions: number[];
  }[] = [];
  if (input.exerciseTypes.includes("ONE_VOWEL"))
    input.hiddenPositions.forEach((position) =>
      configurations.push({ type: "ONE_VOWEL", hiddenPositions: [position] })
    );
  if (input.exerciseTypes.includes("ALL_VOWELS"))
    configurations.push({ type: "ALL_VOWELS", hiddenPositions: input.hiddenPositions });
  if (
    input.exerciseTypes.includes("INITIAL_VOWEL") &&
    firstGraphemeIsVowel(text) &&
    input.hiddenPositions.includes(0)
  )
    configurations.push({ type: "INITIAL_VOWEL", hiddenPositions: [0] });
  if (!configurations.length) throw new Error("No hay configuraciones elegibles");
  return { text, configurations };
}
