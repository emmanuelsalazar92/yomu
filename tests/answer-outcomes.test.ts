import { describe, expect, it } from "vitest";
import {
  calculateOutcomeScore,
  evaluateAnswerOutcome,
  outcomeEarnsPoint,
  outcomeNeedsReview,
  summarizeOutcomes
} from "@/lib/answer-outcomes";

describe("resultado inmutable de la primera respuesta", () => {
  it("clasifica correcto e incorrecto con reglas españolas", () => {
    expect(evaluateAnswerOutcome({ expected: "Á", selected: "A", targetKind: "VOWEL", helpUsed: false })).toBe("CORRECT");
    expect(evaluateAnswerOutcome({ expected: "M", selected: "P", targetKind: "CONSONANT", helpUsed: false })).toBe("INCORRECT");
  });

  it("una respuesta posterior a ayuda nunca cuenta como correcta sin ayuda", () => {
    expect(evaluateAnswerOutcome({ expected: "M", selected: "M", targetKind: "CONSONANT", helpUsed: true })).toBe("ASSISTED");
  });

  it("solo CORRECT suma puntaje y los otros estados requieren repaso", () => {
    const outcomes = ["CORRECT", "INCORRECT", "ASSISTED", "SKIPPED"] as const;
    expect(outcomes.map(outcomeEarnsPoint)).toEqual([true, false, false, false]);
    expect(outcomes.map(outcomeNeedsReview)).toEqual([false, true, true, true]);
    expect(calculateOutcomeScore(outcomes)).toBe(25);
    expect(summarizeOutcomes(outcomes)).toEqual({ correct: 1, incorrect: 1, assisted: 1, skipped: 1, total: 4 });
  });
});
