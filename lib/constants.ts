export const VOWEL_OPTIONS = ["A", "E", "I", "O", "U"] as const;
export const CONSONANT_OPTIONS = [
  "B",
  "C",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "Ñ",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "X",
  "Y",
  "Z"
] as const;
export const DEFAULT_ACTIVE_CONSONANTS = ["M", "P", "L", "S", "T", "N"] as const;
export const MIN_ACTIVE_CONSONANTS = 3;

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
