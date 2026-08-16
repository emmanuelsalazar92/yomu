import { describe, expect, it } from "vitest";
import {
  ENGLISH_ALPHABET,
  ENGLISH_CVC_WORDS,
  ENGLISH_PICTURE_WORDS,
  ENGLISH_SIGHT_WORDS
} from "@/lib/english-activities";

describe("contenido infantil de inglés", () => {
  it("incluye el alfabeto completo sin letras repetidas", () => {
    expect(ENGLISH_ALPHABET).toHaveLength(26);
    expect(new Set(ENGLISH_ALPHABET).size).toBe(26);
  });

  it("ofrece vocabulario visual suficiente y sin duplicados", () => {
    expect(ENGLISH_PICTURE_WORDS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ENGLISH_PICTURE_WORDS.map(({ word }) => word)).size).toBe(
      ENGLISH_PICTURE_WORDS.length
    );
    expect(ENGLISH_PICTURE_WORDS.every(({ emoji }) => Boolean(emoji))).toBe(true);
  });

  it("limita la construcción a palabras CVC de tres letras", () => {
    expect(ENGLISH_CVC_WORDS.length).toBeGreaterThanOrEqual(15);
    expect(ENGLISH_CVC_WORDS.every(({ word }) => word.length === 3)).toBe(true);
  });

  it("incluye al menos veinte sight words", () => {
    expect(ENGLISH_SIGHT_WORDS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ENGLISH_SIGHT_WORDS).size).toBe(ENGLISH_SIGHT_WORDS.length);
  });
});
