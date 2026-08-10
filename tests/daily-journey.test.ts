import { describe, expect, it } from "vitest";
import { dailyActivityCounts } from "@/lib/daily-journey";

describe("duraciones de rutas guiadas", () => {
  it.each([
    [5, { initial: 2, syllable: 2, trace: 1 }],
    [10, { initial: 4, syllable: 4, trace: 2 }],
    [15, { initial: 6, syllable: 6, trace: 3 }]
  ] as const)("reparte la ruta de %i minutos", (minutes, expected) => {
    expect(dailyActivityCounts(minutes)).toEqual(expected);
    expect(expected.initial + expected.syllable + expected.trace).toBe(minutes);
  });
});
