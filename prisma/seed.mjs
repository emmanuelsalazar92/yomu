import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

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

try {
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
  if (!(await prisma.childProfile.count()))
    await prisma.childProfile.create({ data: { nickname: "Explorador", avatar: "🌱" } });
  for (const text of demoWords) {
    const positions = Array.from(text).flatMap((letter, index) =>
      vowels.has(letter) ? [index] : []
    );
    const normalizedText = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (await prisma.word.findFirst({ where: { normalizedText, categoryId: category.id } }))
      continue;
    const configurations = [
      ...positions.map((position) => ({ type: "ONE_VOWEL", hiddenPositions: [position] })),
      { type: "ALL_VOWELS", hiddenPositions: positions }
    ];
    if (vowels.has(Array.from(text)[0]))
      configurations.push({ type: "INITIAL_VOWEL", hiddenPositions: [0] });
    await prisma.word.create({
      data: {
        text,
        normalizedText,
        categoryId: category.id,
        difficulty: text.length > 7 ? 2 : 1,
        configurations: { create: configurations }
      }
    });
  }
} finally {
  await prisma.$disconnect();
}
