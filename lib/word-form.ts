import { z } from "zod";
import { spanishUpper } from "@/lib/spanish";
import { buildWordConfigurations as createConfigurations } from "@/lib/word-configurations";

export const wordSchema = z.object({
  text: z.string().min(1).max(40),
  categoryId: z.uuid(),
  difficulty: z.coerce.number().int().min(1).max(5),
  vowelPositions: z.array(z.number().int().min(0)),
  consonantPositions: z.array(z.number().int().min(0)),
  exerciseTypes: z
    .array(z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "SINGLE_CONSONANT"]))
    .min(1)
});

export function parseWordForm(form: FormData) {
  return wordSchema.parse({
    text: form.get("text"),
    categoryId: form.get("categoryId"),
    difficulty: form.get("difficulty") || 1,
    vowelPositions: JSON.parse(
      String(form.get("vowelPositions") || form.get("hiddenPositions") || "[]")
    ),
    consonantPositions: JSON.parse(String(form.get("consonantPositions") || "[]")),
    exerciseTypes: JSON.parse(String(form.get("exerciseTypes") || "[]"))
  });
}

export function buildWordConfigurations(input: z.infer<typeof wordSchema>) {
  const text = spanishUpper(input.text);
  return { text, configurations: createConfigurations({ ...input, text }) };
}
