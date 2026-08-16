import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(8).max(200)
});
export const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  avatar: z.string().trim().max(8).optional(),
  practiceName: z.string().trim().max(60).optional().nullable(),
  nameActivityEnabled: z.boolean().default(false)
});
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#B9DCCB")
});
export const sessionOptionsSchema = z.object({
  childProfileId: z.uuid(),
  helpMode: z.enum(["WITH_IMAGE", "WITHOUT_IMAGE", "LISTEN"]),
  exerciseType: z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "MIXED", "SINGLE_CONSONANT"]),
  requestedCount: z.union([z.literal(10), z.literal(20), z.literal(30)]),
  categoryId: z.uuid().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  includeLearned: z.boolean().default(false)
});
export const sessionSchema = sessionOptionsSchema.extend({
  requestKey: z.uuid()
});
export const attemptSchema = z.object({
  configurationId: z.uuid(),
  audioPlayCount: z.number().int().min(0).max(100),
  responseTimeMs: z.number().int().min(0).max(3600000),
  answers: z
    .array(
      z
        .object({
          position: z.number().int().min(0),
          selectedLetter: z.string().trim().min(1).max(2).optional(),
          selectedVowel: z.string().trim().min(1).max(2).optional(),
          correctFirstTry: z.boolean(),
          errorCount: z.number().int().min(0).max(100)
        })
        .refine(
          (value) => value.selectedLetter || value.selectedVowel,
          "Falta la letra seleccionada"
        )
        .transform((value) => ({
          ...value,
          selectedLetter: value.selectedLetter ?? value.selectedVowel!
        }))
    )
    .min(1)
});

export const targetAnswerSchema = z.object({
  sessionExerciseId: z.uuid(),
  position: z.number().int().min(0),
  selectedLetter: z.string().trim().min(1).max(2),
  audioPlayCount: z.number().int().min(0).max(100).default(0),
  responseTimeMs: z.number().int().min(0).max(3600000)
});

export const targetHelpSchema = z.object({
  sessionExerciseId: z.uuid(),
  position: z.number().int().min(0),
  reveal: z.boolean().default(false),
  audioPlayCount: z.number().int().min(0).max(100).default(0),
  responseTimeMs: z.number().int().min(0).max(3600000).default(0)
});

export const targetSkipSchema = z.object({
  sessionExerciseId: z.uuid(),
  position: z.number().int().min(0),
  audioPlayCount: z.number().int().min(0).max(100).default(0),
  responseTimeMs: z.number().int().min(0).max(3600000).default(0)
});

export const reviewSessionSchema = z.object({ requestKey: z.uuid() });

export const dailyJourneySchema = z.object({
  childProfileId: z.uuid(),
  durationMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]).default(5)
});

export const dailyAnswerSchema = z
  .object({
    activityId: z.uuid(),
    position: z.number().int().min(0),
    action: z.enum(["ANSWER", "HELP", "SKIP", "TRACE"]),
    selectedPiece: z.string().trim().min(1).max(12).optional(),
    tracePoints: z.number().int().min(0).max(10000).optional(),
    responseTimeMs: z.number().int().min(0).max(3600000).default(0)
  })
  .refine((value) => value.action !== "ANSWER" || value.selectedPiece, {
    message: "Falta la respuesta seleccionada"
  });

export const learningSessionSchema = z
  .object({
    childProfileId: z.uuid(),
    activityType: z.enum([
      "CASE_MATCH",
      "NAME_TILES",
      "SYLLABLE_COUNT",
      "INITIAL_SOUND",
      "SYLLABLE_BUILD",
      "ENGLISH_CASE_MATCH",
      "ENGLISH_VOCABULARY",
      "ENGLISH_INITIAL_SOUND",
      "ENGLISH_CVC_BUILD",
      "ENGLISH_SIGHT_WORD",
      "MATH_NUMBER_QUANTITY",
      "MATH_COUNT_OBJECTS",
      "MATH_COMPARE_QUANTITIES",
      "MATH_NUMBER_SEQUENCE",
      "MATH_ADDITION",
      "MATH_SUBTRACTION",
      "MATH_PLACE_VALUE",
      "MATH_COMPARE_TWO_DIGIT",
      "MATH_ADDITION_TWO_DIGIT",
      "MATH_SUBTRACTION_TWO_DIGIT",
      "MATH_STORY_ADDITION",
      "MATH_STORY_SUBTRACTION",
      "LOGIC_SHAPE",
      "LOGIC_SORT",
      "LOGIC_PATTERN",
      "LOGIC_POSITION",
      "LOGIC_MEASURE",
      "STORY_CHARACTER",
      "STORY_SETTING",
      "STORY_SEQUENCE",
      "STORY_COMPREHENSION",
      "STORY_VOCABULARY"
    ]),
    mode: z.string().trim().min(1).max(40),
    requestedCount: z.union([
      z.literal(1),
      z.literal(5),
      z.literal(10),
      z.literal(20),
      z.literal(30)
    ]),
    requestKey: z.uuid(),
    categoryId: z.uuid().optional(),
    difficulty: z.number().int().min(1).max(5).optional()
  })
  .superRefine((value, context) => {
    const modes = {
      CASE_MATCH: ["UPPER_TO_LOWER", "LOWER_TO_UPPER", "MIXED"],
      NAME_TILES: ["WITH_MODEL", "WITHOUT_MODEL", "MIXED"],
      SYLLABLE_COUNT: ["COUNT"],
      INITIAL_SOUND: ["LISTEN"],
      SYLLABLE_BUILD: ["BUILD"],
      ENGLISH_CASE_MATCH: ["MIXED"],
      ENGLISH_VOCABULARY: ["LISTEN"],
      ENGLISH_INITIAL_SOUND: ["LISTEN"],
      ENGLISH_CVC_BUILD: ["BUILD"],
      ENGLISH_SIGHT_WORD: ["LISTEN"],
      MATH_NUMBER_QUANTITY: ["MATCH"],
      MATH_COUNT_OBJECTS: ["COUNT"],
      MATH_COMPARE_QUANTITIES: ["COMPARE"],
      MATH_NUMBER_SEQUENCE: ["SEQUENCE"],
      MATH_ADDITION: ["CALCULATE"],
      MATH_SUBTRACTION: ["CALCULATE"],
      MATH_PLACE_VALUE: ["PLACE_VALUE"],
      MATH_COMPARE_TWO_DIGIT: ["COMPARE"],
      MATH_ADDITION_TWO_DIGIT: ["CALCULATE"],
      MATH_SUBTRACTION_TWO_DIGIT: ["CALCULATE"],
      MATH_STORY_ADDITION: ["PROBLEM"],
      MATH_STORY_SUBTRACTION: ["PROBLEM"],
      LOGIC_SHAPE: ["SHAPE"],
      LOGIC_SORT: ["SORT"],
      LOGIC_PATTERN: ["PATTERN"],
      LOGIC_POSITION: ["POSITION"],
      LOGIC_MEASURE: ["MEASURE"],
      STORY_CHARACTER: ["LISTEN"],
      STORY_SETTING: ["LISTEN"],
      STORY_SEQUENCE: ["LISTEN"],
      STORY_COMPREHENSION: ["LISTEN"],
      STORY_VOCABULARY: ["LISTEN"]
    } as const;
    if (!(modes[value.activityType] as readonly string[]).includes(value.mode)) {
      context.addIssue({ code: "custom", path: ["mode"], message: "Modo inválido" });
    }
  });

export const learningAnswerSchema = z
  .object({
    itemId: z.uuid(),
    action: z.enum(["ANSWER", "HELP", "SKIP"]),
    response: z.union([z.string().max(60), z.array(z.string().max(100)).max(40)]).optional(),
    responseTimeMs: z.number().int().min(0).max(3600000).default(0),
    technicalReason: z.string().trim().max(200).optional()
  })
  .refine((value) => value.action !== "ANSWER" || value.response !== undefined, {
    message: "Falta la respuesta"
  });
