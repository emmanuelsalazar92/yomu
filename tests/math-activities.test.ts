import { describe, expect, it } from "vitest";
import {
  MATH_ADDITIONS,
  MATH_COMPARISONS,
  MATH_COUNT_CHALLENGES,
  MATH_NUMBERS,
  MATH_SEQUENCES,
  MATH_SUBTRACTIONS,
  MATH_TWO_DIGIT_ADDITIONS,
  MATH_TWO_DIGIT_COMPARISONS,
  MATH_TWO_DIGIT_NUMBERS,
  MATH_TWO_DIGIT_SUBTRACTIONS,
  MATH_STORY_ADDITIONS,
  MATH_STORY_SUBTRACTIONS
} from "@/lib/math-activities";

describe("contenido matemático de primer grado", () => {
  it("trabaja números y conteo del 0 al 10", () => {
    expect(MATH_NUMBERS).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(MATH_COUNT_CHALLENGES).toHaveLength(20);
    expect(MATH_COUNT_CHALLENGES.every(({ count }) => count >= 1 && count <= 10)).toBe(true);
  });

  it("incluye comparaciones iguales y diferentes", () => {
    expect(MATH_COMPARISONS).toHaveLength(20);
    expect(MATH_COMPARISONS.some(([left, right]) => left === right)).toBe(true);
    expect(MATH_COMPARISONS.some(([left, right]) => left !== right)).toBe(true);
  });

  it("mantiene las secuencias entre cero y veinte", () => {
    expect(MATH_SEQUENCES).toHaveLength(20);
    expect(
      MATH_SEQUENCES.every(({ values }) => Math.min(...values) >= 0 && Math.max(...values) <= 20)
    ).toBe(true);
  });

  it("limita sumas y restas a resultados entre cero y diez", () => {
    expect(MATH_ADDITIONS).toHaveLength(30);
    expect(MATH_ADDITIONS.every(({ left, right }) => left + right <= 10)).toBe(true);
    expect(MATH_SUBTRACTIONS).toHaveLength(30);
    expect(MATH_SUBTRACTIONS.every(({ left, right }) => left - right >= 0)).toBe(true);
  });

  it("incluye números y comparaciones de dos dígitos", () => {
    expect(MATH_TWO_DIGIT_NUMBERS).toHaveLength(20);
    expect(MATH_TWO_DIGIT_NUMBERS.every((number) => number >= 10 && number <= 99)).toBe(true);
    expect(MATH_TWO_DIGIT_COMPARISONS).toHaveLength(20);
    expect(MATH_TWO_DIGIT_COMPARISONS.flat().every((number) => number >= 10 && number <= 99)).toBe(
      true
    );
  });

  it("genera treinta operaciones de dos dígitos sin llevadas ni préstamos", () => {
    expect(MATH_TWO_DIGIT_ADDITIONS).toHaveLength(30);
    expect(
      MATH_TWO_DIGIT_ADDITIONS.every(
        ({ left, right }) => left + right <= 99 && (left % 10) + (right % 10) <= 9
      )
    ).toBe(true);
    expect(MATH_TWO_DIGIT_SUBTRACTIONS).toHaveLength(30);
    expect(
      MATH_TWO_DIGIT_SUBTRACTIONS.every(
        ({ left, right }) => left >= right && left % 10 >= right % 10
      )
    ).toBe(true);
  });

  it("incluye problemas cotidianos apropiados para primer grado", () => {
    expect(MATH_STORY_ADDITIONS).toHaveLength(10);
    expect(MATH_STORY_SUBTRACTIONS).toHaveLength(10);
    expect(MATH_STORY_ADDITIONS.every(({ left, right }) => left + right <= 10)).toBe(true);
    expect(MATH_STORY_SUBTRACTIONS.every(({ left, right }) => left >= right)).toBe(true);
  });
});
