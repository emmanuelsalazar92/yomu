import {
  AnswerOutcome,
  LearningActivityType,
  Prisma,
  SessionStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildNameTiles,
  caseCandidates,
  caseOptions,
  progressState,
  NAME_WITHOUT_MODEL_MIN_ACCURACY,
  NAME_WITHOUT_MODEL_MIN_CORRECT,
  spanishLower,
  stableOrder,
  type CaseDirection,
  type NameMode
} from "@/lib/learning-activities";

type SessionInput = {
  childProfileId: string;
  activityType: LearningActivityType;
  mode: string;
  requestedCount: 5 | 10;
  requestKey: string;
  categoryId?: string;
  difficulty?: number;
};

type ItemSeed = {
  wordId?: string;
  targetKey: string;
  prompt: Prisma.InputJsonValue;
  options: Prisma.InputJsonValue;
  correctResponse: Prisma.InputJsonValue;
};

const sessionInclude = {
  childProfile: { select: { id: true, nickname: true, avatar: true } },
  items: { include: { word: { select: { imagePath: true, audioPath: true } } }, orderBy: { position: "asc" as const } }
};

function jsonObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function jsonString(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function jsonStrings(value: Prisma.JsonValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function caseSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const candidates = caseCandidates(settings?.activeConsonants ?? ["M", "P", "L", "S", "T", "N"]);
  if (candidates.length < 3) throw new Error("Se necesitan al menos tres letras activas.");
  const directions: CaseDirection[] = input.mode === "MIXED"
    ? ["UPPER_TO_LOWER", "LOWER_TO_UPPER"]
    : [input.mode as CaseDirection];
  const pool = directions.flatMap((direction) => candidates.map((letter) => ({ letter, direction })));
  return stableOrder(pool, input.requestKey, (item) => `${item.letter}:${item.direction}`)
    .slice(0, input.requestedCount)
    .map(({ letter, direction }, index) => {
      const promptLetter = direction === "UPPER_TO_LOWER" ? letter : spanishLower(letter);
      const answerLetter = direction === "UPPER_TO_LOWER" ? spanishLower(letter) : letter;
      return {
        targetKey: `${letter}:${direction}`,
        prompt: { letter, direction, promptLetter, spokenPrompt: `${promptLetter} corresponde con ${answerLetter}` },
        options: caseOptions(letter, direction, candidates, `${input.requestKey}:${index}`),
        correctResponse: answerLetter
      };
    });
}

async function nameSeeds(input: SessionInput, profile: { practiceName: string | null; nameActivityEnabled: boolean }): Promise<ItemSeed[]> {
  if (!profile.nameActivityEnabled || !profile.practiceName) throw new Error("Esta actividad no está configurada para el perfil.");
  let mode = input.mode as NameMode | "MIXED";
  if (mode === "MIXED") {
    const guided = await prisma.activitySkillProgress.findUnique({
      where: { childProfileId_activityType_skillKey_mode: { childProfileId: input.childProfileId, activityType: "NAME_TILES", skillKey: "NAME", mode: "WITH_MODEL" } }
    });
    mode = guided && guided.firstTryCorrect >= NAME_WITHOUT_MODEL_MIN_CORRECT && guided.recentAccuracy >= NAME_WITHOUT_MODEL_MIN_ACCURACY ? "WITHOUT_MODEL" : "WITH_MODEL";
  }
  const built = buildNameTiles(profile.practiceName, input.requestKey);
  return [{
    targetKey: `NAME:${mode}`,
    prompt: {
      mode,
      showModel: mode === "WITH_MODEL",
      model: mode === "WITH_MODEL" ? profile.practiceName : null,
      slotCount: built.graphemes.length,
      fixed: built.fixed,
      tiles: built.tiles
    },
    options: built.tiles,
    correctResponse: { tileIds: built.answerTileIds, name: profile.practiceName, graphemes: built.graphemes }
  }];
}

async function syllableSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const [words, learned] = await Promise.all([prisma.word.findMany({
    where: {
      active: true,
      deletedAt: null,
      syllables: { isEmpty: false },
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {})
    },
    select: { id: true, text: true, syllables: true, imagePath: true, audioPath: true }
  }), prisma.activitySkillProgress.findMany({
    where: { childProfileId: input.childProfileId, activityType: "SYLLABLE_COUNT", state: "LEARNED", skillKey: { startsWith: "WORD:" } },
    select: { skillKey: true }
  })]);
  const learnedIds = new Set(learned.map((entry) => entry.skillKey.slice(5)));
  return stableOrder(words.filter((word) => !learnedIds.has(word.id)), input.requestKey, (word) => word.id)
    .slice(0, input.requestedCount)
    .map((word) => ({
      wordId: word.id,
      targetKey: `WORD:${word.id}`,
      prompt: { imagePath: word.imagePath, audioPath: word.audioPath, hasCustomAudio: Boolean(word.audioPath), speechText: word.text },
      options: [1, 2, 3, 4],
      correctResponse: { count: word.syllables.length, syllables: word.syllables, word: word.text }
    }));
}

export async function createLearningSession(input: SessionInput) {
  const existing = await prisma.learningActivitySession.findUnique({ where: { requestKey: input.requestKey }, include: sessionInclude });
  if (existing) return serializeLearningSession(existing);
  const profile = await prisma.childProfile.findFirst({ where: { id: input.childProfileId, active: true } });
  if (!profile) throw new Error("Perfil no encontrado.");
  const seeds = input.activityType === "CASE_MATCH"
    ? await caseSeeds(input)
    : input.activityType === "NAME_TILES"
      ? await nameSeeds(input, profile)
      : await syllableSeeds(input);
  if (!seeds.length) throw new Error("No hay contenido elegible para esta actividad.");
  const created = await prisma.learningActivitySession.create({
    data: {
      childProfileId: input.childProfileId,
      activityType: input.activityType,
      mode: input.mode,
      requestedCount: input.requestedCount,
      actualCount: seeds.length,
      requestKey: input.requestKey,
      categoryId: input.categoryId,
      difficulty: input.difficulty,
      items: { create: seeds.map((seed, position) => ({ ...seed, position })) }
    },
    include: sessionInclude
  });
  return serializeLearningSession(created);
}

export async function getLearningSession(id: string) {
  const session = await prisma.learningActivitySession.findUnique({ where: { id }, include: sessionInclude });
  if (!session) throw new Error("Sesión no encontrada.");
  return serializeLearningSession(session);
}

export function serializeLearningSession(session: Prisma.LearningActivitySessionGetPayload<{ include: typeof sessionInclude }>) {
  return {
    id: session.id,
    activityType: session.activityType,
    mode: session.mode,
    requestedCount: session.requestedCount,
    actualCount: session.actualCount,
    status: session.status,
    score: session.score,
    childProfile: session.childProfile,
    items: session.items.map((item) => {
      const answered = item.outcome !== null;
      return {
        id: item.id,
        position: item.position,
        targetKey: item.targetKey,
        prompt: item.prompt,
        options: item.options,
        outcome: item.outcome,
        helpUsed: item.helpUsed,
        firstResponse: item.firstResponse,
        reveal: answered ? item.correctResponse : null,
        hint: item.helpUsed && !answered && session.activityType !== "SYLLABLE_COUNT" ? item.correctResponse : null,
        media: session.activityType === "SYLLABLE_COUNT" ? {
          imageUrl: item.word?.imagePath ? `/api/media/${item.word.imagePath}` : null,
          audioUrl: item.word?.audioPath ? `/api/media/${item.word.audioPath}` : null
        } : null
      };
    })
  };
}

function responseMatches(type: LearningActivityType, correctValue: Prisma.JsonValue, response: Prisma.JsonValue) {
  if (type === "CASE_MATCH") return jsonString(correctValue) === jsonString(response);
  const correct = jsonObject(correctValue);
  if (type === "NAME_TILES") {
    const expected = jsonStrings(correct.tileIds);
    const selected = jsonStrings(response);
    return expected.length === selected.length && expected.every((id, index) => id === selected[index]);
  }
  return Number(correct.count) === Number(response);
}

async function updateOneProgress(
  tx: Prisma.TransactionClient,
  data: { childProfileId: string; activityType: LearningActivityType; skillKey: string; mode: string; outcome: AnswerOutcome; sessionId: string }
) {
  const key = { childProfileId: data.childProfileId, activityType: data.activityType, skillKey: data.skillKey, mode: data.mode };
  const current = await tx.activitySkillProgress.findUnique({ where: { childProfileId_activityType_skillKey_mode: key } });
  const attempts = (current?.attempts ?? 0) + 1;
  const correct = (current?.firstTryCorrect ?? 0) + (data.outcome === "CORRECT" ? 1 : 0);
  const errors = (current?.errorCount ?? 0) + (data.outcome === "INCORRECT" ? 1 : 0);
  const assisted = (current?.assistedCount ?? 0) + (data.outcome === "ASSISTED" ? 1 : 0);
  const skipped = (current?.skippedCount ?? 0) + (data.outcome === "SKIPPED" ? 1 : 0);
  const sessions = (current?.distinctSessions ?? 0) + 1;
  const recentAccuracy = Math.round(((correct + assisted * 0.5) / attempts) * 1000) / 1000;
  await tx.activitySkillProgress.upsert({
    where: { childProfileId_activityType_skillKey_mode: key },
    create: { ...key, attempts, firstTryCorrect: correct, errorCount: errors, assistedCount: assisted, skippedCount: skipped, distinctSessions: sessions, recentAccuracy, state: progressState(attempts, correct, sessions), lastPracticedAt: new Date() },
    update: { attempts, firstTryCorrect: correct, errorCount: errors, assistedCount: assisted, skippedCount: skipped, distinctSessions: sessions, recentAccuracy, state: progressState(attempts, correct, sessions), lastPracticedAt: new Date() }
  });
}

export async function recordLearningAction(input: {
  sessionId: string;
  itemId: string;
  action: "ANSWER" | "HELP" | "SKIP";
  response?: string | string[];
  responseTimeMs: number;
  technicalReason?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.learningActivityItem.findFirst({
      where: { id: input.itemId, sessionId: input.sessionId },
      include: { session: true }
    });
    if (!item) throw new Error("Actividad no encontrada.");
    if (input.action === "HELP") {
      if (!item.outcome) await tx.learningActivityItem.update({ where: { id: item.id }, data: { helpUsed: true } });
      return;
    }
    if (item.outcome) return;
    const outcome: AnswerOutcome = input.action === "SKIP"
      ? "SKIPPED"
      : responseMatches(item.session.activityType, item.correctResponse, input.response as Prisma.JsonValue)
        ? item.helpUsed ? "ASSISTED" : "CORRECT"
        : "INCORRECT";
    let storedResponse: Prisma.InputJsonValue | undefined = input.response;
    if (item.session.activityType === "NAME_TILES" && Array.isArray(input.response)) {
      const expected = jsonStrings(jsonObject(item.correctResponse).tileIds);
      const correctPositions = input.response.reduce<number[]>((positions, tileId, position) => {
        if (tileId === expected[position]) positions.push(position);
        return positions;
      }, []);
      storedResponse = {
        tileIds: input.response,
        correctPositions,
        incorrectPositions: input.response.map((_, position) => position).filter((position) => !correctPositions.includes(position))
      };
    }
    const updated = await tx.learningActivityItem.updateMany({
      where: { id: item.id, outcome: null },
      data: {
        outcome,
        firstResponse: storedResponse,
        responseTimeMs: input.responseTimeMs,
        technicalSkipReason: input.action === "SKIP" ? input.technicalReason : undefined,
        answeredAt: new Date()
      }
    });
    if (!updated.count) return;
    const prompt = jsonObject(item.prompt);
    const correct = jsonObject(item.correctResponse);
    const mode = jsonString(prompt.mode) || jsonString(prompt.direction) || item.session.mode;
    await updateOneProgress(tx, {
      childProfileId: item.session.childProfileId,
      activityType: item.session.activityType,
      skillKey: item.session.activityType === "CASE_MATCH" ? item.targetKey.split(":")[0] : item.session.activityType === "NAME_TILES" ? "NAME" : item.targetKey,
      mode,
      outcome,
      sessionId: item.sessionId
    });
    if (item.session.activityType === "SYLLABLE_COUNT") {
      await updateOneProgress(tx, { childProfileId: item.session.childProfileId, activityType: item.session.activityType, skillKey: `COUNT:${Number(correct.count)}`, mode: "COUNT", outcome, sessionId: item.sessionId });
    }
    const pending = await tx.learningActivityItem.count({ where: { sessionId: input.sessionId, outcome: null } });
    if (!pending) {
      const correctCount = await tx.learningActivityItem.count({ where: { sessionId: input.sessionId, outcome: { in: ["CORRECT", "ASSISTED"] } } });
      await tx.learningActivitySession.update({ where: { id: input.sessionId }, data: { status: SessionStatus.COMPLETED, completedAt: new Date(), score: correctCount } });
    }
  });
  return getLearningSession(input.sessionId);
}

export async function reviewLearningSession(sessionId: string, requestKey: string) {
  const existing = await prisma.learningActivitySession.findUnique({ where: { requestKey }, include: sessionInclude });
  if (existing) return serializeLearningSession(existing);
  const source = await prisma.learningActivitySession.findUnique({ where: { id: sessionId }, include: { items: { where: { outcome: { in: ["INCORRECT", "SKIPPED"] } } } } });
  if (!source) throw new Error("Sesión no encontrada.");
  if (!source.items.length) throw new Error("No hay elementos para repasar.");
  const created = await prisma.learningActivitySession.create({
    data: {
      childProfileId: source.childProfileId, activityType: source.activityType, mode: source.mode,
      requestedCount: source.items.length, actualCount: source.items.length, requestKey,
      categoryId: source.categoryId, difficulty: source.difficulty, reviewOfSessionId: source.id,
      items: { create: source.items.map((item, position) => ({ position, wordId: item.wordId, targetKey: `${item.targetKey}:review`, prompt: item.prompt as Prisma.InputJsonValue, options: item.options as Prisma.InputJsonValue, correctResponse: item.correctResponse as Prisma.InputJsonValue })) }
    }, include: sessionInclude
  });
  return serializeLearningSession(created);
}
