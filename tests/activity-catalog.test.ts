import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATALOG,
  ACTIVITY_LEVELS,
  ENGLISH_ACTIVITY_CATALOG,
  ENGLISH_ACTIVITY_LEVELS,
  MATH_ACTIVITY_CATALOG,
  MATH_ACTIVITY_LEVELS,
  LOGIC_ACTIVITY_CATALOG,
  LOGIC_ACTIVITY_LEVELS,
  STORY_ACTIVITY_CATALOG,
  STORY_ACTIVITY_LEVELS,
  activitiesForLevel,
  activityHref,
  englishActivitiesForLevel,
  mathActivitiesForLevel,
  logicActivitiesForLevel,
  storyActivitiesForLevel
} from "@/lib/activity-catalog";

describe("catálogo de actividades", () => {
  it("agrupa diez actividades únicas en tres niveles", () => {
    expect(ACTIVITY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3]);
    expect(ACTIVITY_CATALOG).toHaveLength(10);
    expect(new Set(ACTIVITY_CATALOG.map((activity) => activity.id)).size).toBe(10);
    expect(activitiesForLevel(1)).toHaveLength(3);
    expect(activitiesForLevel(2)).toHaveLength(3);
    expect(activitiesForLevel(3)).toHaveLength(4);
  });

  it("oculta únicamente la actividad del nombre cuando el perfil no la tiene activa", () => {
    expect(activitiesForLevel(1, false).map((activity) => activity.id)).toEqual([
      "TRACE_LETTER",
      "CASE_MATCH"
    ]);
  });

  it("crea enlaces directos con los defaults del nivel", () => {
    const sound = ACTIVITY_CATALOG.find((activity) => activity.id === "INITIAL_SOUND")!;
    const href = activityHref(sound, "perfil", "solicitud");
    expect(href).toContain("/jugar/actividad/sesion?");
    expect(href).toContain("type=INITIAL_SOUND");
    expect(href).toContain("count=20");
    expect(href).toContain("mode=LISTEN");
  });

  it("separa inglés en seis actividades y tres niveles progresivos", () => {
    expect(ENGLISH_ACTIVITY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3]);
    expect(ENGLISH_ACTIVITY_CATALOG).toHaveLength(6);
    expect(englishActivitiesForLevel(1)).toHaveLength(2);
    expect(englishActivitiesForLevel(2)).toHaveLength(2);
    expect(englishActivitiesForLevel(3)).toHaveLength(2);
    expect(ENGLISH_ACTIVITY_CATALOG.map((activity) => activity.count).filter(Boolean)).toEqual([
      10, 20, 20, 30, 30
    ]);
  });

  it("mantiene el idioma inglés en los enlaces de práctica", () => {
    const trace = ENGLISH_ACTIVITY_CATALOG.find((activity) => activity.id === "ENGLISH_TRACE")!;
    const vocabulary = ENGLISH_ACTIVITY_CATALOG.find(
      (activity) => activity.id === "ENGLISH_VOCABULARY"
    )!;
    expect(activityHref(trace, "perfil", "solicitud")).toContain("idioma=en");
    expect(activityHref(vocabulary, "perfil", "solicitud")).toContain("language=en");
  });

  it("agrupa doce actividades matemáticas en seis niveles", () => {
    expect(MATH_ACTIVITY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(MATH_ACTIVITY_CATALOG).toHaveLength(12);
    expect(mathActivitiesForLevel(1)).toHaveLength(2);
    expect(mathActivitiesForLevel(2)).toHaveLength(2);
    expect(mathActivitiesForLevel(3)).toHaveLength(2);
    expect(mathActivitiesForLevel(4)).toHaveLength(2);
    expect(mathActivitiesForLevel(5)).toHaveLength(2);
    expect(mathActivitiesForLevel(6)).toHaveLength(2);
    expect(MATH_ACTIVITY_CATALOG.map((activity) => activity.count)).toEqual([
      10, 10, 20, 20, 30, 30, 20, 20, 30, 30, 20, 20
    ]);
  });

  it("ofrece rutas progresivas de lógica y cuentos", () => {
    expect(LOGIC_ACTIVITY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5]);
    expect(STORY_ACTIVITY_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5]);
    expect(LOGIC_ACTIVITY_CATALOG).toHaveLength(5);
    expect(STORY_ACTIVITY_CATALOG).toHaveLength(5);
    expect(logicActivitiesForLevel(3)[0].id).toBe("LOGIC_PATTERN");
    expect(storyActivitiesForLevel(4)[0].id).toBe("STORY_COMPREHENSION");
    expect(activityHref(LOGIC_ACTIVITY_CATALOG[0], "perfil", "solicitud")).toContain(
      "subject=logic"
    );
    expect(activityHref(STORY_ACTIVITY_CATALOG[0], "perfil", "solicitud")).toContain(
      "subject=stories"
    );
  });

  it("mantiene matemáticas como ruta independiente", () => {
    const addition = MATH_ACTIVITY_CATALOG.find((activity) => activity.id === "MATH_ADDITION")!;
    const href = activityHref(addition, "perfil", "solicitud");
    expect(href).toContain("type=MATH_ADDITION");
    expect(href).toContain("subject=math");
    expect(href).toContain("count=30");
  });
});
