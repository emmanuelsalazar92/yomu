import { describe, expect, it } from "vitest";
import {
  LOGIC_MEASURES,
  LOGIC_PATTERNS,
  LOGIC_POSITIONS,
  LOGIC_SHAPES,
  LOGIC_SORT_CHALLENGES
} from "@/lib/logic-activities";
import { STORY_CHALLENGES } from "@/lib/story-activities";

describe("rutas de lógica y cuentos", () => {
  it("ofrece contenido visual variado con una respuesta válida", () => {
    expect(LOGIC_SHAPES).toHaveLength(5);
    expect(LOGIC_SORT_CHALLENGES).toHaveLength(10);
    expect(LOGIC_PATTERNS).toHaveLength(10);
    expect(LOGIC_POSITIONS).toHaveLength(6);
    expect(LOGIC_MEASURES).toHaveLength(6);
    expect(
      LOGIC_SORT_CHALLENGES.every((challenge) =>
        challenge.options.some((option) => option.value === challenge.answer)
      )
    ).toBe(true);
    expect(
      LOGIC_PATTERNS.every((pattern) =>
        (pattern.options as readonly string[]).includes(pattern.answer)
      )
    ).toBe(true);
  });

  it("cada cuento ejercita cinco habilidades de comprensión", () => {
    expect(STORY_CHALLENGES).toHaveLength(5);
    for (const story of STORY_CHALLENGES) {
      expect(story.story.split(" ").length).toBeGreaterThan(12);
      expect(story.scenes).toHaveLength(3);
      for (const challenge of [
        story.character,
        story.setting,
        story.first,
        story.comprehension,
        story.vocabulary
      ]) {
        expect(challenge.options).toHaveLength(3);
        expect(challenge.options.some((option) => option.value === challenge.answer)).toBe(true);
      }
    }
  });
});
