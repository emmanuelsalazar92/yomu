import { describe, expect, it } from "vitest";
import { normalizeTraceRepetitions, TRACE_LETTERS } from "@/lib/trace-practice";

describe("práctica libre de trazado", () => {
  it("incluye las 27 letras del alfabeto español", () => {
    expect(TRACE_LETTERS).toHaveLength(27);
    expect(TRACE_LETTERS).toContain("Ñ");
  });

  it.each([
    [0, 1],
    [4.6, 5],
    [80, 50],
    [Number.NaN, 1]
  ])("limita %s a una cantidad segura", (input, expected) => {
    expect(normalizeTraceRepetitions(input)).toBe(expected);
  });
});
