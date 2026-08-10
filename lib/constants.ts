export const VOWEL_OPTIONS = ["A", "E", "I", "O", "U"] as const;

export const MASTERY = {
  firstTryCorrect: 5,
  recentAccuracy: 0.8,
  distinctSessions: 3,
  withoutImageCorrect: 2,
  recentWindow: 10
} as const;

export const MEDIA_LIMITS = {
  imageBytes: 5 * 1024 * 1024,
  audioBytes: 5 * 1024 * 1024,
  imageMime: ["image/jpeg", "image/png", "image/webp"],
  audioMime: ["audio/mpeg"]
} as const;
