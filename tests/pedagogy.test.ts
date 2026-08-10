import { describe, expect, it } from "vitest";
import { adaptiveSelect, calculateScore, evaluateMastery } from "@/lib/pedagogy";
describe("progreso pedagógico", () => {
  it("calcula la nota por espacios", () => {
    expect(calculateScore(7, 10)).toBe(70);
    expect(calculateScore(0, 0)).toBe(0);
  });
  it("transita a aprendida solo con todos los criterios", () => {
    const samples = [
      { firstTryCorrect: true, sessionId: "1", mode: "WITHOUT_IMAGE" as const },
      { firstTryCorrect: true, sessionId: "1", mode: "WITHOUT_IMAGE" as const },
      { firstTryCorrect: true, sessionId: "2", mode: "WITH_IMAGE" as const },
      { firstTryCorrect: true, sessionId: "2", mode: "LISTEN" as const },
      { firstTryCorrect: true, sessionId: "3", mode: "WITH_IMAGE" as const },
      { firstTryCorrect: false, sessionId: "3", mode: "WITH_IMAGE" as const }
    ];
    expect(evaluateMastery(samples).state).toBe("LEARNED");
  });
  it("mantiene aprendizaje si falta práctica distribuida", () => {
    const samples = Array.from({ length: 6 }, () => ({
      firstTryCorrect: true,
      sessionId: "1",
      mode: "WITHOUT_IMAGE" as const
    }));
    expect(evaluateMastery(samples).state).not.toBe("LEARNED");
  });
  it("excluye aprendidas y nunca repite una palabra en la sesión", () => {
    const candidates = [
      { id: "a", state: "LEARNED" as const, recentErrors: 0, vowelFamilies: ["A"] },
      { id: "b", state: "LEARNING" as const, recentErrors: 2, vowelFamilies: ["E"] },
      { id: "c", state: "NEW" as const, recentErrors: 0, vowelFamilies: ["I"] }
    ];
    const result = adaptiveSelect(candidates, 8, false, () => 0);
    expect(result.some((item) => item.id === "a")).toBe(false);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((item) => item.id)).size).toBe(result.length);
  });
  it.each([
    { available: 3, requested: 10, expected: 3 },
    { available: 10, requested: 10, expected: 10 },
    { available: 15, requested: 10, expected: 10 }
  ])(
    "elige $expected de $available disponibles al pedir $requested",
    ({ available, requested, expected }) => {
      const candidates = Array.from({ length: available }, (_, index) => ({
        id: `word-${index}`,
        state: (index % 2 ? "LEARNING" : "NEW") as "LEARNING" | "NEW",
        recentErrors: index % 3,
        vowelFamilies: []
      }));
      const result = adaptiveSelect(candidates, requested, false, () => 0);
      expect(result).toHaveLength(expected);
      expect(new Set(result.map((item) => item.id)).size).toBe(expected);
    }
  );
  it("deduplica configuraciones que pertenecen a la misma palabra", () => {
    const duplicate = { id: "oso", state: "NEW" as const, recentErrors: 0, vowelFamilies: ["O"] };
    const result = adaptiveSelect(
      [duplicate, { ...duplicate, vowelFamilies: ["O", "A"] }],
      10,
      false,
      () => 0
    );
    expect(result.map((item) => item.id)).toEqual(["oso"]);
  });
  it("incluye palabras aprendidas únicamente cuando se solicita repaso", () => {
    const learned = [{ id: "sol", state: "LEARNED" as const, recentErrors: 0, vowelFamilies: [] }];
    expect(adaptiveSelect(learned, 10, false)).toHaveLength(0);
    expect(adaptiveSelect(learned, 10, true)).toHaveLength(1);
  });
});
