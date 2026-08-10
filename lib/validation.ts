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
  exerciseType: z.enum(["ONE_VOWEL", "ALL_VOWELS", "INITIAL_VOWEL", "MIXED"]),
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
      z.object({
        position: z.number().int().min(0),
        selectedVowel: z.enum(["A", "E", "I", "O", "U"]),
        correctFirstTry: z.boolean(),
        errorCount: z.number().int().min(0).max(100)
      })
    )
    .min(1)
});
