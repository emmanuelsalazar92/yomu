export const LOGIC_SHAPES = [
  { shape: "circle", label: "círculo", color: "#4F8ED8" },
  { shape: "square", label: "cuadrado", color: "#E36A6A" },
  { shape: "triangle", label: "triángulo", color: "#E6A72C" },
  { shape: "rectangle", label: "rectángulo", color: "#58A878" },
  { shape: "oval", label: "óvalo", color: "#9568C7" }
] as const;

export const LOGIC_SORT_CHALLENGES = [
  {
    rule: "Es una fruta",
    options: [
      { value: "apple", label: "manzana", emoji: "🍎" },
      { value: "car", label: "carro", emoji: "🚗" },
      { value: "shoe", label: "zapato", emoji: "👟" }
    ],
    answer: "apple"
  },
  {
    rule: "Es un animal",
    options: [
      { value: "dog", label: "perro", emoji: "🐶" },
      { value: "book", label: "libro", emoji: "📘" },
      { value: "cup", label: "taza", emoji: "☕" }
    ],
    answer: "dog"
  },
  {
    rule: "Se usa para viajar",
    options: [
      { value: "bus", label: "autobús", emoji: "🚌" },
      { value: "flower", label: "flor", emoji: "🌻" },
      { value: "bread", label: "pan", emoji: "🍞" }
    ],
    answer: "bus"
  },
  {
    rule: "Vive en el agua",
    options: [
      { value: "fish", label: "pez", emoji: "🐟" },
      { value: "cat", label: "gato", emoji: "🐱" },
      { value: "bird", label: "pájaro", emoji: "🐦" }
    ],
    answer: "fish"
  },
  {
    rule: "Se puede comer",
    options: [
      { value: "banana", label: "banano", emoji: "🍌" },
      { value: "ball", label: "pelota", emoji: "⚽" },
      { value: "pencil", label: "lápiz", emoji: "✏️" }
    ],
    answer: "banana"
  },
  {
    rule: "Sirve cuando llueve",
    options: [
      { value: "umbrella", label: "paraguas", emoji: "☂️" },
      { value: "kite", label: "cometa", emoji: "🪁" },
      { value: "drum", label: "tambor", emoji: "🥁" }
    ],
    answer: "umbrella"
  },
  {
    rule: "Es una prenda de vestir",
    options: [
      { value: "shirt", label: "camisa", emoji: "👕" },
      { value: "clock", label: "reloj", emoji: "⏰" },
      { value: "tree", label: "árbol", emoji: "🌳" }
    ],
    answer: "shirt"
  },
  {
    rule: "Crece en una planta",
    options: [
      { value: "flower", label: "flor", emoji: "🌷" },
      { value: "train", label: "tren", emoji: "🚂" },
      { value: "chair", label: "silla", emoji: "🪑" }
    ],
    answer: "flower"
  },
  {
    rule: "Puede volar",
    options: [
      { value: "butterfly", label: "mariposa", emoji: "🦋" },
      { value: "turtle", label: "tortuga", emoji: "🐢" },
      { value: "snail", label: "caracol", emoji: "🐌" }
    ],
    answer: "butterfly"
  },
  {
    rule: "Se usa para escribir",
    options: [
      { value: "pencil", label: "lápiz", emoji: "✏️" },
      { value: "spoon", label: "cuchara", emoji: "🥄" },
      { value: "sock", label: "media", emoji: "🧦" }
    ],
    answer: "pencil"
  }
] as const;

export const LOGIC_PATTERNS = [
  { values: ["🔵", "🟡", "🔵", "🟡"], answer: "🔵", options: ["🔵", "🟡", "🟢"] },
  { values: ["🍎", "🍎", "🍌", "🍎", "🍎", "🍌"], answer: "🍎", options: ["🍎", "🍌", "🍇"] },
  { values: ["▲", "■", "●", "▲", "■", "●"], answer: "▲", options: ["▲", "■", "●"] },
  { values: ["🐶", "🐱", "🐶", "🐱"], answer: "🐶", options: ["🐶", "🐱", "🐰"] },
  { values: ["🌱", "🌿", "🌳", "🌱", "🌿", "🌳"], answer: "🌱", options: ["🌱", "🌿", "🌳"] },
  { values: ["⭐", "⭐", "🌙", "⭐", "⭐", "🌙"], answer: "⭐", options: ["⭐", "🌙", "☀️"] },
  { values: ["🚗", "🚌", "🚌", "🚗", "🚌", "🚌"], answer: "🚗", options: ["🚗", "🚌", "🚲"] },
  { values: ["1", "2", "1", "2"], answer: "1", options: ["1", "2", "3"] },
  { values: ["❤️", "💙", "💚", "❤️", "💙", "💚"], answer: "❤️", options: ["❤️", "💙", "💚"] },
  { values: ["☀️", "☁️", "☀️", "☁️"], answer: "☀️", options: ["☀️", "☁️", "🌧️"] }
] as const;

export const LOGIC_POSITIONS = [
  { position: "above", label: "arriba de", options: ["arriba de", "abajo de", "dentro de"] },
  { position: "below", label: "abajo de", options: ["abajo de", "arriba de", "fuera de"] },
  { position: "inside", label: "dentro de", options: ["dentro de", "fuera de", "a la derecha de"] },
  { position: "outside", label: "fuera de", options: ["fuera de", "dentro de", "abajo de"] },
  {
    position: "left",
    label: "a la izquierda de",
    options: ["a la izquierda de", "a la derecha de", "arriba de"]
  },
  {
    position: "right",
    label: "a la derecha de",
    options: ["a la derecha de", "a la izquierda de", "abajo de"]
  }
] as const;

export const LOGIC_MEASURES = [
  {
    question: "¿Cuál es más largo?",
    left: 90,
    right: 180,
    leftLabel: "lápiz azul",
    rightLabel: "lápiz rojo",
    answer: "RIGHT",
    emoji: "✏️"
  },
  {
    question: "¿Cuál es más corto?",
    left: 160,
    right: 80,
    leftLabel: "cinta verde",
    rightLabel: "cinta amarilla",
    answer: "RIGHT",
    emoji: "🎗️"
  },
  {
    question: "¿Cuál es más alto?",
    left: 100,
    right: 170,
    leftLabel: "torre azul",
    rightLabel: "torre roja",
    answer: "RIGHT",
    emoji: "🧱"
  },
  {
    question: "¿Cuál es más bajo?",
    left: 85,
    right: 145,
    leftLabel: "árbol pequeño",
    rightLabel: "árbol grande",
    answer: "LEFT",
    emoji: "🌳"
  },
  {
    question: "¿Cuál es más largo?",
    left: 190,
    right: 110,
    leftLabel: "camino naranja",
    rightLabel: "camino morado",
    answer: "LEFT",
    emoji: "➖"
  },
  {
    question: "¿Cuál es más corto?",
    left: 120,
    right: 200,
    leftLabel: "regla corta",
    rightLabel: "regla larga",
    answer: "LEFT",
    emoji: "📏"
  }
] as const;
