import { MASTERY } from "@/lib/constants";

export type ProgressState = "NEW" | "LEARNING" | "ALMOST_LEARNED" | "LEARNED";

export interface MasterySample {
  firstTryCorrect: boolean;
  sessionId: string;
  mode: "WITH_IMAGE" | "WITHOUT_IMAGE" | "LISTEN";
}

export function calculateScore(firstTryCorrectSpaces: number, totalSpaces: number): number {
  return totalSpaces === 0 ? 0 : Math.round((firstTryCorrectSpaces / totalSpaces) * 100);
}

export function evaluateMastery(samples: MasterySample[]): {
  state: ProgressState;
  accuracy: number;
} {
  if (samples.length === 0) return { state: "NEW", accuracy: 0 };
  const recent = samples.slice(-MASTERY.recentWindow);
  const correct = recent.filter((sample) => sample.firstTryCorrect).length;
  const accuracy = correct / recent.length;
  const sessions = new Set(samples.map((sample) => sample.sessionId)).size;
  const withoutImageCorrect = samples.filter(
    (sample) => sample.mode === "WITHOUT_IMAGE" && sample.firstTryCorrect
  ).length;
  const learned =
    correct >= MASTERY.firstTryCorrect &&
    accuracy >= MASTERY.recentAccuracy &&
    sessions >= MASTERY.distinctSessions &&
    withoutImageCorrect >= MASTERY.withoutImageCorrect;
  if (learned) return { state: "LEARNED", accuracy };
  if (correct >= 3 && accuracy >= 0.7) return { state: "ALMOST_LEARNED", accuracy };
  return { state: "LEARNING", accuracy };
}

export interface SelectionCandidate {
  id: string;
  state: ProgressState;
  recentErrors: number;
  targetLetters?: string[];
  /** Compatibilidad con consumidores históricos del motor de vocales. */
  vowelFamilies?: string[];
}

export function adaptiveSelect(
  candidates: SelectionCandidate[],
  count: number,
  includeLearned = false,
  random: () => number = Math.random
): SelectionCandidate[] {
  const unique = new Map<string, SelectionCandidate>();
  for (const candidate of candidates) {
    if (!unique.has(candidate.id)) unique.set(candidate.id, candidate);
  }
  const eligible = [...unique.values()].filter(
    (candidate) => includeLearned || candidate.state !== "LEARNED"
  );
  if (!eligible.length) return [];
  const buckets = {
    errors: eligible.filter((candidate) => candidate.recentErrors > 0),
    learning: eligible.filter((candidate) =>
      ["LEARNING", "ALMOST_LEARNED"].includes(candidate.state)
    ),
    new: eligible.filter((candidate) => candidate.state === "NEW"),
    learned: eligible.filter((candidate) => candidate.state === "LEARNED")
  };
  const pattern = [
    "learning",
    "errors",
    "learning",
    "new",
    "learning",
    "errors",
    "learning",
    "errors",
    "learning",
    "learned"
  ] as const;
  const remaining = new Set(eligible.map((candidate) => candidate.id));
  const result: SelectionCandidate[] = [];
  for (let index = 0; index < Math.min(count, eligible.length); index += 1) {
    const desired = buckets[pattern[index % pattern.length]].filter((item) =>
      remaining.has(item.id)
    );
    const fallback = eligible.filter((item) => remaining.has(item.id));
    const pool = desired.length ? desired : fallback;
    const choice = pool[Math.floor(random() * pool.length)];
    result.push(choice);
    remaining.delete(choice.id);
  }
  return result;
}
