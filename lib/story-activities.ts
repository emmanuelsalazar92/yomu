export type StoryChallenge = {
  id: string;
  title: string;
  story: string;
  scenes: string[];
  character: { answer: string; options: Array<{ value: string; label: string; emoji: string }> };
  setting: { answer: string; options: Array<{ value: string; label: string; emoji: string }> };
  first: { answer: string; options: Array<{ value: string; label: string; emoji: string }> };
  comprehension: {
    question: string;
    answer: string;
    options: Array<{ value: string; label: string; emoji: string }>;
  };
  vocabulary: {
    word: string;
    question: string;
    answer: string;
    options: Array<{ value: string; label: string; emoji: string }>;
  };
};

export const STORY_CHALLENGES: readonly StoryChallenge[] = [
  {
    id: "luna-semilla",
    title: "Luna y la semilla",
    scenes: ["👧", "🌱", "🌻"],
    story:
      "Luna sembró una semilla en el jardín. Cada mañana le dio agua. Un día nació un girasol amarillo.",
    character: {
      answer: "luna",
      options: [
        { value: "luna", label: "Luna", emoji: "👧" },
        { value: "tomas", label: "Tomás", emoji: "👦" },
        { value: "gato", label: "El gato", emoji: "🐱" }
      ]
    },
    setting: {
      answer: "garden",
      options: [
        { value: "garden", label: "El jardín", emoji: "🌻" },
        { value: "beach", label: "La playa", emoji: "🏖️" },
        { value: "school", label: "La escuela", emoji: "🏫" }
      ]
    },
    first: {
      answer: "plant",
      options: [
        { value: "plant", label: "Sembró una semilla", emoji: "🌱" },
        { value: "water", label: "Le dio agua", emoji: "💧" },
        { value: "flower", label: "Nació el girasol", emoji: "🌻" }
      ]
    },
    comprehension: {
      question: "¿Por qué nació el girasol?",
      answer: "care",
      options: [
        { value: "care", label: "Luna cuidó la semilla", emoji: "💧" },
        { value: "wind", label: "Sopló mucho viento", emoji: "💨" },
        { value: "sleep", label: "Luna se durmió", emoji: "😴" }
      ]
    },
    vocabulary: {
      word: "sembró",
      question: "¿Qué significa sembró?",
      answer: "put-seed",
      options: [
        { value: "put-seed", label: "Puso una semilla en la tierra", emoji: "🌱" },
        { value: "painted", label: "Pintó una flor", emoji: "🎨" },
        { value: "ate", label: "Comió una fruta", emoji: "🍎" }
      ]
    }
  },
  {
    id: "nico-parque",
    title: "Nico comparte",
    scenes: ["👦", "⚽", "🧒"],
    story:
      "Nico llevó su pelota al parque. Vio a una niña que estaba sola y la invitó a jugar. Los dos rieron mucho.",
    character: {
      answer: "nico",
      options: [
        { value: "nico", label: "Nico", emoji: "👦" },
        { value: "luna", label: "Luna", emoji: "👧" },
        { value: "dog", label: "Un perro", emoji: "🐶" }
      ]
    },
    setting: {
      answer: "park",
      options: [
        { value: "park", label: "El parque", emoji: "🛝" },
        { value: "home", label: "La casa", emoji: "🏠" },
        { value: "farm", label: "La granja", emoji: "🚜" }
      ]
    },
    first: {
      answer: "bring",
      options: [
        { value: "bring", label: "Llevó su pelota", emoji: "⚽" },
        { value: "invite", label: "Invitó a la niña", emoji: "🤝" },
        { value: "laugh", label: "Los dos rieron", emoji: "😄" }
      ]
    },
    comprehension: {
      question: "¿Cómo ayudó Nico a la niña?",
      answer: "invite",
      options: [
        { value: "invite", label: "La invitó a jugar", emoji: "🤝" },
        { value: "leave", label: "Se fue del parque", emoji: "🚪" },
        { value: "hide", label: "Escondió la pelota", emoji: "🙈" }
      ]
    },
    vocabulary: {
      word: "invitó",
      question: "¿Qué significa invitó?",
      answer: "asked",
      options: [
        { value: "asked", label: "Le pidió participar", emoji: "🤝" },
        { value: "pushed", label: "La empujó", emoji: "🫷" },
        { value: "forgot", label: "La olvidó", emoji: "🤔" }
      ]
    }
  },
  {
    id: "mila-biblioteca",
    title: "Mila encuentra un libro",
    scenes: ["🐱", "📚", "📖"],
    story:
      "La gata Mila entró en la biblioteca. Encontró un libro de planetas y miró sus dibujos. Luego se quedó dormida junto al libro.",
    character: {
      answer: "mila",
      options: [
        { value: "mila", label: "Mila", emoji: "🐱" },
        { value: "frog", label: "Una rana", emoji: "🐸" },
        { value: "boy", label: "Un niño", emoji: "👦" }
      ]
    },
    setting: {
      answer: "library",
      options: [
        { value: "library", label: "La biblioteca", emoji: "📚" },
        { value: "kitchen", label: "La cocina", emoji: "🍳" },
        { value: "river", label: "El río", emoji: "🏞️" }
      ]
    },
    first: {
      answer: "enter",
      options: [
        { value: "enter", label: "Entró en la biblioteca", emoji: "🚪" },
        { value: "find", label: "Encontró un libro", emoji: "📖" },
        { value: "sleep", label: "Se durmió", emoji: "😴" }
      ]
    },
    comprehension: {
      question: "¿Qué libro encontró Mila?",
      answer: "planets",
      options: [
        { value: "planets", label: "Un libro de planetas", emoji: "🪐" },
        { value: "food", label: "Un libro de recetas", emoji: "🥣" },
        { value: "cars", label: "Un libro de carros", emoji: "🚗" }
      ]
    },
    vocabulary: {
      word: "biblioteca",
      question: "¿Qué es una biblioteca?",
      answer: "books",
      options: [
        { value: "books", label: "Un lugar con libros", emoji: "📚" },
        { value: "food", label: "Un lugar para cocinar", emoji: "🍳" },
        { value: "swim", label: "Un lugar para nadar", emoji: "🏊" }
      ]
    }
  },
  {
    id: "tito-lluvia",
    title: "Tito y la lluvia",
    scenes: ["🐢", "🌧️", "☂️"],
    story:
      "Tito la tortuga salió a caminar. Comenzó a llover y se escondió bajo una hoja grande. Cuando salió el sol, siguió contento su camino.",
    character: {
      answer: "tito",
      options: [
        { value: "tito", label: "Tito", emoji: "🐢" },
        { value: "rabbit", label: "Un conejo", emoji: "🐰" },
        { value: "bird", label: "Un pájaro", emoji: "🐦" }
      ]
    },
    setting: {
      answer: "path",
      options: [
        { value: "path", label: "Un camino", emoji: "🛤️" },
        { value: "class", label: "El aula", emoji: "🏫" },
        { value: "sea", label: "El mar", emoji: "🌊" }
      ]
    },
    first: {
      answer: "walk",
      options: [
        { value: "walk", label: "Salió a caminar", emoji: "🐢" },
        { value: "rain", label: "Comenzó a llover", emoji: "🌧️" },
        { value: "sun", label: "Salió el sol", emoji: "☀️" }
      ]
    },
    comprehension: {
      question: "¿Por qué se escondió Tito?",
      answer: "rain",
      options: [
        { value: "rain", label: "Porque llovía", emoji: "🌧️" },
        { value: "sleep", label: "Porque tenía sueño", emoji: "😴" },
        { value: "eat", label: "Porque quería comer", emoji: "🥬" }
      ]
    },
    vocabulary: {
      word: "se escondió",
      question: "¿Qué significa se escondió?",
      answer: "cover",
      options: [
        { value: "cover", label: "Se puso donde no lo mojara la lluvia", emoji: "☂️" },
        { value: "jump", label: "Saltó muy alto", emoji: "🦘" },
        { value: "sing", label: "Cantó una canción", emoji: "🎵" }
      ]
    }
  },
  {
    id: "ana-merienda",
    title: "La merienda de Ana",
    scenes: ["👧", "🍓", "🥣"],
    story:
      "Ana lavó tres fresas en la cocina. Las cortó con ayuda de su papá y las puso en un tazón. Compartieron una merienda deliciosa.",
    character: {
      answer: "ana",
      options: [
        { value: "ana", label: "Ana", emoji: "👧" },
        { value: "nico", label: "Nico", emoji: "👦" },
        { value: "bear", label: "Un oso", emoji: "🐻" }
      ]
    },
    setting: {
      answer: "kitchen",
      options: [
        { value: "kitchen", label: "La cocina", emoji: "🍳" },
        { value: "park", label: "El parque", emoji: "🛝" },
        { value: "moon", label: "La luna", emoji: "🌙" }
      ]
    },
    first: {
      answer: "wash",
      options: [
        { value: "wash", label: "Lavó las fresas", emoji: "💧" },
        { value: "cut", label: "Cortó las fresas", emoji: "🔪" },
        { value: "share", label: "Compartieron la merienda", emoji: "🥣" }
      ]
    },
    comprehension: {
      question: "¿Quién ayudó a Ana?",
      answer: "dad",
      options: [
        { value: "dad", label: "Su papá", emoji: "👨" },
        { value: "teacher", label: "Su maestra", emoji: "👩‍🏫" },
        { value: "friend", label: "Una amiga", emoji: "👧" }
      ]
    },
    vocabulary: {
      word: "deliciosa",
      question: "¿Qué significa deliciosa?",
      answer: "tasty",
      options: [
        { value: "tasty", label: "Que sabe muy rico", emoji: "😋" },
        { value: "cold", label: "Que está muy fría", emoji: "🥶" },
        { value: "loud", label: "Que suena fuerte", emoji: "📢" }
      ]
    }
  }
] as const;
