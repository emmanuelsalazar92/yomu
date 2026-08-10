import { describe, expect, it } from "vitest";
import {
  answerMatches,
  detectVowels,
  firstGraphemeIsVowel,
  graphemes,
  maskWord,
  normalizeForSearch,
  spanishUpper
} from "@/lib/spanish";
describe("reglas del español", () => {
  it.each([
    ["MANZANA", [1, 4, 6], "M_NZ_N_"],
    ["ELEFANTE", [0, 2, 4, 7], "_L_F_NT_"],
    ["ÁRBOL", [0, 3], "_RB_L"],
    ["AVIÓN", [0, 2, 3], "_V__N"],
    ["PINGÜINO", [1, 4, 5, 7], "P_NG__N_"]
  ])("detecta y oculta vocales en %s", (word, positions, masked) => {
    expect(detectVowels(word).map((item) => item.index)).toEqual(positions);
    expect(maskWord(word, positions)).toBe(masked);
  });
  it("conserva la ortografía y compara por familia", () => {
    expect(spanishUpper("pingüino")).toBe("PINGÜINO");
    expect(answerMatches("Á", "A")).toBe(true);
    expect(answerMatches("Ü", "U")).toBe(true);
    expect(normalizeForSearch("Árbol")).toBe("ARBOL");
  });
  it("trabaja con grafemas", () => {
    expect(graphemes("A👩‍👧E")).toEqual(["A", "👩‍👧", "E"]);
  });
  it("solo permite vocal inicial cuando corresponde", () => {
    expect(firstGraphemeIsVowel("ELEFANTE")).toBe(true);
    expect(firstGraphemeIsVowel("SILBATO")).toBe(false);
  });
});
