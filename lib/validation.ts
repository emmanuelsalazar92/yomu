import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().max(200),
  password: z.string().min(8).max(200)
});
export const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
  avatar: z.string().trim().max(8).optional()
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
