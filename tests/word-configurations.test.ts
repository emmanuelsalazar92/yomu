import { describe, expect, it } from "vitest";
import { buildWordConfigurations } from "@/lib/word-configurations";

describe("configuraciones compartidas de letras", () => {
  it("mantiene vocales y crea una variante por consonante seleccionada", () => {
    const configurations = buildWordConfigurations({
      text: "MANZANA",
      vowelPositions: [1, 4, 6],
      consonantPositions: [0, 2, 5],
      exerciseTypes: ["ONE_VOWEL", "ALL_VOWELS", "SINGLE_CONSONANT"]
    });
    expect(configurations.filter((item) => item.type === "ONE_VOWEL")).toHaveLength(3);
    expect(configurations.filter((item) => item.type === "ALL_VOWELS")).toEqual([
      { type: "ALL_VOWELS", hiddenPositions: [1, 4, 6] }
    ]);
    expect(configurations.filter((item) => item.type === "SINGLE_CONSONANT")).toEqual([
      { type: "SINGLE_CONSONANT", hiddenPositions: [0] },
      { type: "SINGLE_CONSONANT", hiddenPositions: [2] },
      { type: "SINGLE_CONSONANT", hiddenPositions: [5] }
    ]);
  });

  it("rechaza posiciones cruzadas entre grupos", () => {
    expect(() =>
      buildWordConfigurations({
        text: "SOL",
        vowelPositions: [],
        consonantPositions: [1],
        exerciseTypes: ["SINGLE_CONSONANT"]
      })
    ).toThrow(/consonantes/);
  });
});
