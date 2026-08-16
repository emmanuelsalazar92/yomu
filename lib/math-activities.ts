export const MATH_NUMBERS = Array.from({ length: 11 }, (_, value) => value);

export const MATH_OBJECTS = ["⭐", "🍎", "🐟", "🦋", "🚗", "🌼", "🧸", "⚽"] as const;

export const MATH_COUNT_CHALLENGES = Array.from({ length: 20 }, (_, index) => ({
  count: (index % 10) + 1,
  emoji: MATH_OBJECTS[Math.floor(index / 10) + (index % 6)]
}));

export const MATH_COMPARISONS = [
  [2, 5],
  [6, 3],
  [4, 4],
  [1, 7],
  [8, 5],
  [3, 6],
  [9, 2],
  [5, 5],
  [7, 4],
  [2, 8],
  [6, 9],
  [10, 3],
  [1, 1],
  [4, 7],
  [8, 6],
  [3, 3],
  [5, 9],
  [7, 2],
  [10, 8],
  [6, 6]
] as const;

export const MATH_SEQUENCES = Array.from({ length: 20 }, (_, index) => {
  const start = index % 19;
  const missingIndex = index % 3;
  return {
    values: [start, start + 1, start + 2],
    missingIndex,
    answer: start + missingIndex
  };
});

export const MATH_ADDITIONS = Array.from({ length: 6 }, (_, left) =>
  Array.from({ length: 5 }, (_, index) => ({ left, right: index + 1 }))
)
  .flat()
  .filter(({ left, right }) => left + right <= 10);

export const MATH_SUBTRACTIONS = Array.from({ length: 10 }, (_, index) => index + 1)
  .flatMap((left) =>
    Array.from({ length: Math.min(left, 4) }, (_, index) => ({ left, right: index + 1 }))
  )
  .slice(0, 30);

export const MATH_TWO_DIGIT_NUMBERS = [
  12, 18, 23, 27, 31, 36, 42, 45, 50, 54, 59, 63, 67, 71, 76, 80, 84, 89, 93, 97
] as const;

export const MATH_TWO_DIGIT_COMPARISONS = [
  [12, 21],
  [34, 29],
  [45, 54],
  [67, 62],
  [18, 81],
  [73, 37],
  [26, 32],
  [49, 44],
  [58, 65],
  [91, 19],
  [35, 53],
  [78, 72],
  [24, 42],
  [86, 68],
  [57, 51],
  [39, 63],
  [82, 28],
  [47, 74],
  [69, 64],
  [93, 89]
] as const;

export const MATH_TWO_DIGIT_ADDITIONS = Array.from({ length: 70 }, (_, index) => index + 10)
  .flatMap((left) =>
    Array.from({ length: 40 }, (_, index) => index + 10).map((right) => ({ left, right }))
  )
  .filter(({ left, right }) => left + right <= 99 && (left % 10) + (right % 10) <= 9)
  .filter((_, index) => index % 41 === 0)
  .slice(0, 30);

export const MATH_TWO_DIGIT_SUBTRACTIONS = Array.from({ length: 80 }, (_, index) => index + 20)
  .flatMap((left) =>
    Array.from({ length: left - 10 }, (_, index) => index + 10).map((right) => ({ left, right }))
  )
  .filter(({ left, right }) => left >= right && left % 10 >= right % 10 && left - right >= 10)
  .filter((_, index) => index % 37 === 0)
  .slice(0, 30);

export const MATH_STORY_ADDITIONS = [
  {
    story: "Luna tenía 3 manzanas y su papá le dio 2 más. ¿Cuántas manzanas tiene ahora?",
    left: 3,
    right: 2,
    emoji: "🍎"
  },
  {
    story: "En una caja hay 4 carritos y Nico guarda 3 más. ¿Cuántos carritos hay?",
    left: 4,
    right: 3,
    emoji: "🚗"
  },
  {
    story: "Ana encontró 2 conchas y luego encontró 5 más. ¿Cuántas conchas encontró?",
    left: 2,
    right: 5,
    emoji: "🐚"
  },
  {
    story: "Hay 5 pájaros en un árbol y llegan 3 más. ¿Cuántos pájaros hay?",
    left: 5,
    right: 3,
    emoji: "🐦"
  },
  {
    story: "Tito construyó 6 bloques y agregó 2. ¿Cuántos bloques usó?",
    left: 6,
    right: 2,
    emoji: "🧱"
  },
  {
    story: "Mila tenía 1 globo y recibió 6 más. ¿Cuántos globos tiene?",
    left: 1,
    right: 6,
    emoji: "🎈"
  },
  {
    story: "En el plato había 4 fresas y pusieron 4 más. ¿Cuántas fresas hay?",
    left: 4,
    right: 4,
    emoji: "🍓"
  },
  {
    story: "Nico puso 7 libros en la mesa y Ana puso 2 más. ¿Cuántos libros hay?",
    left: 7,
    right: 2,
    emoji: "📚"
  },
  {
    story: "Había 3 peces azules y llegaron 4 amarillos. ¿Cuántos peces hay?",
    left: 3,
    right: 4,
    emoji: "🐟"
  },
  {
    story: "Luna recogió 5 flores y su amiga recogió 5. ¿Cuántas flores recogieron?",
    left: 5,
    right: 5,
    emoji: "🌼"
  }
] as const;

export const MATH_STORY_SUBTRACTIONS = [
  {
    story: "Había 7 galletas y Ana comió 2. ¿Cuántas galletas quedan?",
    left: 7,
    right: 2,
    emoji: "🍪"
  },
  {
    story: "Nico tenía 8 globos y regaló 3. ¿Cuántos globos le quedan?",
    left: 8,
    right: 3,
    emoji: "🎈"
  },
  {
    story: "En el estanque había 9 patos y 4 se fueron. ¿Cuántos patos quedan?",
    left: 9,
    right: 4,
    emoji: "🦆"
  },
  {
    story: "Luna guardó 6 crayones y usó 2. ¿Cuántos crayones quedan?",
    left: 6,
    right: 2,
    emoji: "🖍️"
  },
  {
    story: "Había 10 fresas y papá usó 5. ¿Cuántas fresas quedan?",
    left: 10,
    right: 5,
    emoji: "🍓"
  },
  {
    story: "Tito apiló 7 bloques y quitó 3. ¿Cuántos bloques quedan?",
    left: 7,
    right: 3,
    emoji: "🧱"
  },
  {
    story: "Mila tenía 5 libros y devolvió 1. ¿Cuántos libros conserva?",
    left: 5,
    right: 1,
    emoji: "📚"
  },
  {
    story: "Había 8 carros y guardaron 4. ¿Cuántos quedaron afuera?",
    left: 8,
    right: 4,
    emoji: "🚗"
  },
  {
    story: "Ana tenía 9 flores y regaló 2. ¿Cuántas flores le quedan?",
    left: 9,
    right: 2,
    emoji: "🌼"
  },
  {
    story: "En el árbol había 6 pájaros y 3 volaron. ¿Cuántos pájaros quedan?",
    left: 6,
    right: 3,
    emoji: "🐦"
  }
] as const;
