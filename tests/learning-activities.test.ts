import { describe, expect, it } from "vitest";
import {
  SPANISH_ALPHABET,
  buildNameTiles,
  caseCandidates,
  caseOptions,
  nameTileAnswerMatches,
  parseSyllables,
  validatePracticeName,
  validateSyllables
} from "@/lib/learning-activities";

describe("case match", () => {
  it("uses vowels, active consonants and three stable unique options", () => {
    const candidates = caseCandidates(["M", "P", "Ñ"]);
    expect(candidates).toEqual(["A", "E", "I", "O", "U", "M", "P", "Ñ"]);
    const first = caseOptions("Ñ", "UPPER_TO_LOWER", candidates, "seed");
    expect(first).toEqual(caseOptions("Ñ", "UPPER_TO_LOWER", candidates, "seed"));
    expect(new Set(first).size).toBe(3);
    expect(first).toContain("ñ");
  });
  it("contains the 27 locale-aware pairs including Ñ/ñ in both directions", () => {
    expect(SPANISH_ALPHABET).toHaveLength(27);
    expect(caseOptions("Ñ", "UPPER_TO_LOWER", ["A", "M", "Ñ"], "pair")).toContain("ñ");
    expect(caseOptions("Ñ", "LOWER_TO_UPPER", ["A", "M", "Ñ"], "pair")).toContain("Ñ");
  });
});

describe("name tiles", () => {
  it("validates the intentionally configured practice name", () => {
    expect(validatePracticeName("María-José").normalized).toBe("MARÍA-JOSÉ");
    expect(validatePracticeName("Ana 3").valid).toBe(false);
    expect(validatePracticeName("Iñaki María").valid).toBe(true);
    expect(validatePracticeName("A".repeat(31)).valid).toBe(false);
  });

  it("gives repeated letters independent tile identities and fixes separators", () => {
    const result = buildNameTiles("ANA-MARÍA", "seed");
    expect(result.tiles.filter((tile) => tile.value === "A")).toHaveLength(4);
    expect(new Set(result.tiles.map((tile) => tile.id)).size).toBe(result.tiles.length);
    expect(result.fixed).toEqual([{ index: 3, value: "-" }]);
    expect(nameTileAnswerMatches(result.answerTileIds, result.answerTileIds)).toBe(true);
    expect(nameTileAnswerMatches(result.answerTileIds, [...result.answerTileIds].reverse())).toBe(false);
  });
});

describe("syllable configuration", () => {
  it("only enables exact manual separations of one to four syllables", () => {
    expect(parseSyllables("man-za-na")).toEqual(["MAN", "ZA", "NA"]);
    expect(validateSyllables("MANZANA", "MAN-ZA-NA").eligible).toBe(true);
    expect(validateSyllables("MANZANA", "MAN-NA").eligible).toBe(false);
    expect(validateSyllables("MARIPOSA", "M-A-R-I-P-O-S-A").eligible).toBe(false);
    expect(validateSyllables("PINGÜINO", "PIN-GÜI-NO").eligible).toBe(true);
    expect(validateSyllables("ÁRBOL", "AR-BOL").eligible).toBe(false);
  });
});
