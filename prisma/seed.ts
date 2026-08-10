import { hash } from "bcryptjs";
import { PrismaClient, ExerciseType } from "@prisma/client";

const prisma = new PrismaClient();
const vowels = new Set(["A", "Á", "E", "É", "I", "Í", "O", "Ó", "U", "Ú", "Ü"]);
const demoWords = [
  "VACA",
  "MANZANA",
  "GATO",
  "PERRO",
  "CASA",
  "BOLA",
  "SOL",
  "UVAS",
  "ELEFANTE",
  "ISLA",
  "OSO",
  "OJO",
  "ESTRELLA",
  "IGLÚ",
  "UNICORNIO",
  "OVEJA",
  "AVIÓN",
  "SILBATO",
  "TORTUGA",
  "ÁRBOL"
];
const demoSyllables: Record<string, string[]> = {
  VACA: ["VA", "CA"], MANZANA: ["MAN", "ZA", "NA"], GATO: ["GA", "TO"],
  PERRO: ["PE", "RRO"], CASA: ["CA", "SA"], BOLA: ["BO", "LA"], SOL: ["SOL"],
  UVAS: ["U", "VAS"], ELEFANTE: ["E", "LE", "FAN", "TE"], ISLA: ["IS", "LA"],
  OSO: ["O", "SO"], OJO: ["O", "JO"], ESTRELLA: ["ES", "TRE", "LLA"],
  "IGLÚ": ["I", "GLÚ"], UNICORNIO: ["U", "NI", "COR", "NIO"], OVEJA: ["O", "VE", "JA"],
  "AVIÓN": ["A", "VIÓN"], SILBATO: ["SIL", "BA", "TO"], TORTUGA: ["TOR", "TU", "GA"],
  "ÁRBOL": ["ÁR", "BOL"]
};

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@yomu.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "cambia-esta-contrasena";
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await hash(password, 12) }
  });
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" }
  });
  const category = await prisma.category.upsert({
    where: { name: "Palabras de demostración" },
    update: {},
    create: { name: "Palabras de demostración", color: "#B9DCCB" }
  });
  const demoProfile = await prisma.childProfile.findFirst({ where: { nickname: "Explorador" } });
  if (!demoProfile) {
    await prisma.childProfile.create({ data: { nickname: "Explorador", avatar: "🌱", practiceName: "LUNA", nameActivityEnabled: true } });
  } else if (!demoProfile.practiceName) {
    await prisma.childProfile.update({ where: { id: demoProfile.id }, data: { practiceName: "LUNA", nameActivityEnabled: true } });
  }
  for (const text of demoWords) {
    const positions = Array.from(text).flatMap((letter, index) =>
      vowels.has(letter) ? [index] : []
    );
    const normalizedText = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const existing = await prisma.word.findFirst({
      where: { normalizedText, categoryId: category.id }
    });
    if (existing) {
      if (!existing.syllables.length) await prisma.word.update({ where: { id: existing.id }, data: { syllables: demoSyllables[text] ?? [] } });
      continue;
    }
    const configurations: { type: ExerciseType; hiddenPositions: number[] }[] = [
      ...positions.map((position) => ({
        type: ExerciseType.ONE_VOWEL,
        hiddenPositions: [position]
      })),
      { type: ExerciseType.ALL_VOWELS, hiddenPositions: positions }
    ];
    if (vowels.has(Array.from(text)[0]))
      configurations.push({ type: ExerciseType.INITIAL_VOWEL, hiddenPositions: [0] });
    await prisma.word.create({
      data: {
        text,
        normalizedText,
        categoryId: category.id,
        difficulty: text.length > 7 ? 2 : 1,
        syllables: demoSyllables[text] ?? [],
        configurations: { create: configurations }
      }
    });
  }
}

main().finally(() => prisma.$disconnect());
