export type EnglishPictureWord = {
  word: string;
  emoji: string;
};

export const ENGLISH_ALPHABET = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

export const ENGLISH_PICTURE_WORDS: readonly EnglishPictureWord[] = [
  { word: "CAT", emoji: "🐱" },
  { word: "DOG", emoji: "🐶" },
  { word: "SUN", emoji: "☀️" },
  { word: "MOON", emoji: "🌙" },
  { word: "APPLE", emoji: "🍎" },
  { word: "BALL", emoji: "⚽" },
  { word: "CAR", emoji: "🚗" },
  { word: "BOOK", emoji: "📘" },
  { word: "FISH", emoji: "🐟" },
  { word: "BIRD", emoji: "🐦" },
  { word: "TREE", emoji: "🌳" },
  { word: "HOUSE", emoji: "🏠" },
  { word: "MILK", emoji: "🥛" },
  { word: "HAND", emoji: "✋" },
  { word: "SHOE", emoji: "👟" },
  { word: "HAT", emoji: "🧢" },
  { word: "BED", emoji: "🛏️" },
  { word: "CUP", emoji: "🥤" },
  { word: "DUCK", emoji: "🦆" },
  { word: "FROG", emoji: "🐸" },
  { word: "CAKE", emoji: "🍰" },
  { word: "STAR", emoji: "⭐" },
  { word: "BUS", emoji: "🚌" },
  { word: "BABY", emoji: "👶" }
] as const;

export const ENGLISH_CVC_WORDS: readonly EnglishPictureWord[] = [
  { word: "CAT", emoji: "🐱" },
  { word: "DOG", emoji: "🐶" },
  { word: "SUN", emoji: "☀️" },
  { word: "HAT", emoji: "🧢" },
  { word: "BED", emoji: "🛏️" },
  { word: "CUP", emoji: "🥤" },
  { word: "PIG", emoji: "🐷" },
  { word: "BUS", emoji: "🚌" },
  { word: "MAP", emoji: "🗺️" },
  { word: "BOX", emoji: "📦" },
  { word: "FOX", emoji: "🦊" },
  { word: "HEN", emoji: "🐔" },
  { word: "RED", emoji: "🟥" },
  { word: "LEG", emoji: "🦵" },
  { word: "LOG", emoji: "🪵" },
  { word: "PEN", emoji: "🖊️" },
  { word: "JAM", emoji: "🍓" },
  { word: "VAN", emoji: "🚐" },
  { word: "NET", emoji: "🥅" },
  { word: "TOP", emoji: "🔝" }
] as const;

export const ENGLISH_SIGHT_WORDS = [
  "I",
  "A",
  "THE",
  "SEE",
  "MY",
  "LIKE",
  "CAN",
  "WE",
  "GO",
  "TO",
  "ME",
  "IS",
  "IT",
  "IN",
  "ON",
  "UP",
  "AND",
  "YOU",
  "HE",
  "SHE"
] as const;

export function englishLower(value: string) {
  return value.toLocaleLowerCase("en-US");
}
