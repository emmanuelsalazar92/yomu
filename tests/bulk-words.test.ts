import { describe, expect, it } from "vitest";
import { parseBulkWordText, prepareBulkWord } from "@/lib/bulk-words";

describe("carga múltiple de palabras", () => {
  it("acepta líneas, comas y punto y coma, normaliza y elimina repetidas", () => {
    expect(parseBulkWordText(" casa\nLuna, CASA;  árbol  ")).toEqual(["CASA", "LUNA", "ÁRBOL"]);
  });

  it("detecta todas las posiciones configurables automáticamente", () => {
    const result = prepareBulkWord("mapa", ["ONE_VOWEL", "ALL_VOWELS", "SINGLE_CONSONANT"]);
    expect(result.text).toBe("MAPA");
    expect(result.configurations).toEqual([
      { type: "ONE_VOWEL", hiddenPositions: [1] },
      { type: "ONE_VOWEL", hiddenPositions: [3] },
      { type: "ALL_VOWELS", hiddenPositions: [1, 3] },
      { type: "SINGLE_CONSONANT", hiddenPositions: [0] },
      { type: "SINGLE_CONSONANT", hiddenPositions: [2] }
    ]);
  });

  it("explica cuando el ejercicio elegido no aplica", () => {
    expect(() => prepareBulkWord("SOL", ["INITIAL_VOWEL"])).toThrow(
      /No hay configuraciones elegibles/
    );
  });
});
