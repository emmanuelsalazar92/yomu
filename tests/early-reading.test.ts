import { describe, expect, it } from "vitest";
import {
  buildAdultRecommendation,
  initialSound,
  syllabifySpanish
} from "@/lib/early-reading";

describe("lectura inicial", () => {
  it.each([
    ["MAPA", ["MA", "PA"]],
    ["MONO", ["MO", "NO"]],
    ["PELOTA", ["PE", "LO", "TA"]],
    ["MANZANA", ["MAN", "ZA", "NA"]],
    ["ESTRELLA", ["ES", "TRE", "LLA"]]
  ])("separa %s en sílabas", (word, expected) => {
    expect(syllabifySpanish(word)).toEqual(expected);
  });

  it("normaliza el sonido inicial", () => {
    expect(initialSound("ÁRBOL")).toBe("A");
    expect(initialSound("mapa")).toBe("M");
  });

  it("propone al adulto solamente los objetivos que costaron", () => {
    expect(
      buildAdultRecommendation([
        { type: "INITIAL_SOUND", expectedPiece: "M", outcome: "INCORRECT" },
        { type: "SYLLABLE_BUILD", expectedPiece: "PA", outcome: "ASSISTED" },
        { type: "TRACE_LETTER", expectedPiece: "L", outcome: "CORRECT" }
      ])
    ).toContain("M");
  });
});
