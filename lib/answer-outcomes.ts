import type { AnswerOutcome } from "@prisma/client";
import type { LetterTargetKind } from "@/lib/spanish";
import { targetMatches } from "@/lib/spanish";

export type OutcomeInput = {
  expected: string;
  selected: string;
  targetKind: LetterTargetKind;
  helpUsed: boolean;
};

export function evaluateAnswerOutcome(input: OutcomeInput): AnswerOutcome {
  if (input.helpUsed) return "ASSISTED";
  return targetMatches(input.expected, input.selected, input.targetKind)
    ? "CORRECT"
    : "INCORRECT";
}

export function outcomeEarnsPoint(outcome: AnswerOutcome) {
  return outcome === "CORRECT";
}

export function outcomeNeedsReview(outcome: AnswerOutcome | null) {
  return outcome !== null && outcome !== "CORRECT";
}

export function calculateOutcomeScore(outcomes: readonly AnswerOutcome[]) {
  if (outcomes.length === 0) return 0;
  return Math.round((outcomes.filter(outcomeEarnsPoint).length / outcomes.length) * 100);
}

export function summarizeOutcomes(outcomes: readonly AnswerOutcome[]) {
  return {
    correct: outcomes.filter((item) => item === "CORRECT").length,
    incorrect: outcomes.filter((item) => item === "INCORRECT").length,
    assisted: outcomes.filter((item) => item === "ASSISTED").length,
    skipped: outcomes.filter((item) => item === "SKIPPED").length,
    total: outcomes.length
  };
}
