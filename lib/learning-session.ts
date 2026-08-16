import { AnswerOutcome, LearningActivityType, Prisma, SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  initialSound,
  isEarlySyllableWord,
  stableChoices,
  syllabifySpanish
} from "@/lib/early-reading";
import {
  ENGLISH_ALPHABET,
  ENGLISH_CVC_WORDS,
  ENGLISH_PICTURE_WORDS,
  ENGLISH_SIGHT_WORDS,
  englishLower
} from "@/lib/english-activities";
import {
  MATH_ADDITIONS,
  MATH_COMPARISONS,
  MATH_COUNT_CHALLENGES,
  MATH_NUMBERS,
  MATH_OBJECTS,
  MATH_SEQUENCES,
  MATH_SUBTRACTIONS,
  MATH_STORY_ADDITIONS,
  MATH_STORY_SUBTRACTIONS,
  MATH_TWO_DIGIT_ADDITIONS,
  MATH_TWO_DIGIT_COMPARISONS,
  MATH_TWO_DIGIT_NUMBERS,
  MATH_TWO_DIGIT_SUBTRACTIONS
} from "@/lib/math-activities";
import {
  LOGIC_MEASURES,
  LOGIC_PATTERNS,
  LOGIC_POSITIONS,
  LOGIC_SHAPES,
  LOGIC_SORT_CHALLENGES
} from "@/lib/logic-activities";
import { STORY_CHALLENGES } from "@/lib/story-activities";
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
  requestedCount: 1 | 5 | 10 | 20 | 30;
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
  items: {
    include: { word: { select: { imagePath: true, audioPath: true } } },
    orderBy: { position: "asc" as const }
  }
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
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function caseSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const candidates = caseCandidates(settings?.activeConsonants ?? ["M", "P", "L", "S", "T", "N"]);
  if (candidates.length < 3) throw new Error("Se necesitan al menos tres letras activas.");
  const directions: CaseDirection[] =
    input.mode === "MIXED" ? ["UPPER_TO_LOWER", "LOWER_TO_UPPER"] : [input.mode as CaseDirection];
  const pool = directions.flatMap((direction) =>
    candidates.map((letter) => ({ letter, direction }))
  );
  return stableOrder(pool, input.requestKey, (item) => `${item.letter}:${item.direction}`)
    .slice(0, input.requestedCount)
    .map(({ letter, direction }, index) => {
      const promptLetter = direction === "UPPER_TO_LOWER" ? letter : spanishLower(letter);
      const answerLetter = direction === "UPPER_TO_LOWER" ? spanishLower(letter) : letter;
      return {
        targetKey: `${letter}:${direction}`,
        prompt: {
          letter,
          direction,
          promptLetter,
          spokenPrompt: `${promptLetter} corresponde con ${answerLetter}`
        },
        options: caseOptions(letter, direction, candidates, `${input.requestKey}:${index}`),
        correctResponse: answerLetter
      };
    });
}

async function nameSeeds(
  input: SessionInput,
  profile: { practiceName: string | null; nameActivityEnabled: boolean }
): Promise<ItemSeed[]> {
  if (!profile.nameActivityEnabled || !profile.practiceName)
    throw new Error("Esta actividad no está configurada para el perfil.");
  let mode = input.mode as NameMode | "MIXED";
  if (mode === "MIXED") {
    const guided = await prisma.activitySkillProgress.findUnique({
      where: {
        childProfileId_activityType_skillKey_mode: {
          childProfileId: input.childProfileId,
          activityType: "NAME_TILES",
          skillKey: "NAME",
          mode: "WITH_MODEL"
        }
      }
    });
    mode =
      guided &&
      guided.firstTryCorrect >= NAME_WITHOUT_MODEL_MIN_CORRECT &&
      guided.recentAccuracy >= NAME_WITHOUT_MODEL_MIN_ACCURACY
        ? "WITHOUT_MODEL"
        : "WITH_MODEL";
  }
  const built = buildNameTiles(profile.practiceName, input.requestKey);
  return [
    {
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
      correctResponse: {
        tileIds: built.answerTileIds,
        name: profile.practiceName,
        graphemes: built.graphemes
      }
    }
  ];
}

async function syllableSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const [words, learned] = await Promise.all([
    prisma.word.findMany({
      where: {
        active: true,
        deletedAt: null,
        syllables: { isEmpty: false },
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {})
      },
      select: { id: true, text: true, syllables: true, imagePath: true, audioPath: true }
    }),
    prisma.activitySkillProgress.findMany({
      where: {
        childProfileId: input.childProfileId,
        activityType: "SYLLABLE_COUNT",
        state: "LEARNED",
        skillKey: { startsWith: "WORD:" }
      },
      select: { skillKey: true }
    })
  ]);
  const learnedIds = new Set(learned.map((entry) => entry.skillKey.slice(5)));
  return stableOrder(
    words.filter((word) => !learnedIds.has(word.id)),
    input.requestKey,
    (word) => word.id
  )
    .slice(0, input.requestedCount)
    .map((word) => ({
      wordId: word.id,
      targetKey: `WORD:${word.id}`,
      prompt: {
        imagePath: word.imagePath,
        audioPath: word.audioPath,
        hasCustomAudio: Boolean(word.audioPath),
        speechText: word.text
      },
      options: [1, 2, 3, 4],
      correctResponse: { count: word.syllables.length, syllables: word.syllables, word: word.text }
    }));
}

async function initialSoundSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const [words, learned] = await Promise.all([
    prisma.word.findMany({
      where: {
        active: true,
        deletedAt: null,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {})
      },
      select: { id: true, text: true, imagePath: true, audioPath: true }
    }),
    prisma.activitySkillProgress.findMany({
      where: {
        childProfileId: input.childProfileId,
        activityType: "INITIAL_SOUND",
        state: "LEARNED",
        skillKey: { startsWith: "WORD:" }
      },
      select: { skillKey: true }
    })
  ]);
  const learnedIds = new Set(learned.map((entry) => entry.skillKey.slice(5)));
  const soundPool = [
    ...new Set([
      ...words.map((word) => initialSound(word.text)).filter(Boolean),
      "M",
      "P",
      "L",
      "S",
      "A",
      "E"
    ])
  ];
  return stableOrder(
    words.filter((word) => !learnedIds.has(word.id) && initialSound(word.text)),
    input.requestKey,
    (word) => word.id
  )
    .slice(0, input.requestedCount)
    .map((word) => {
      const expected = initialSound(word.text);
      const distractors = stableChoices(
        soundPool.filter((sound) => sound !== expected),
        `${input.requestKey}:initial:${word.id}`,
        2
      );
      return {
        wordId: word.id,
        targetKey: `WORD:${word.id}`,
        prompt: { speechText: word.text },
        options: stableChoices(
          [expected, ...distractors],
          `${input.requestKey}:initial-options:${word.id}`
        ),
        correctResponse: expected
      };
    });
}

async function syllableBuildSeeds(input: SessionInput): Promise<ItemSeed[]> {
  const [words, learned] = await Promise.all([
    prisma.word.findMany({
      where: {
        active: true,
        deletedAt: null,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {})
      },
      select: { id: true, text: true, syllables: true, imagePath: true, audioPath: true }
    }),
    prisma.activitySkillProgress.findMany({
      where: {
        childProfileId: input.childProfileId,
        activityType: "SYLLABLE_BUILD",
        state: "LEARNED",
        skillKey: { startsWith: "WORD:" }
      },
      select: { skillKey: true }
    })
  ]);
  const learnedIds = new Set(learned.map((entry) => entry.skillKey.slice(5)));
  const candidates = words
    .map((word) => ({
      ...word,
      pieces: word.syllables.length ? word.syllables : syllabifySpanish(word.text)
    }))
    .filter(
      (word) =>
        !learnedIds.has(word.id) &&
        word.pieces.length >= 2 &&
        word.pieces.length <= 4 &&
        (word.syllables.length > 0 || isEarlySyllableWord(word.text))
    );
  const syllablePool = [...new Set(candidates.flatMap((word) => word.pieces))];
  return stableOrder(candidates, input.requestKey, (word) => word.id)
    .slice(0, input.requestedCount)
    .map((word) => {
      const distractors = stableChoices(
        syllablePool.filter((syllable) => !word.pieces.includes(syllable)),
        `${input.requestKey}:syllable-distractors:${word.id}`,
        2
      );
      const optionTiles = [
        ...word.pieces.map((value, index) => ({ id: `expected-${index}`, value })),
        ...distractors.map((value, index) => ({ id: `distractor-${index}`, value }))
      ];
      return {
        wordId: word.id,
        targetKey: `WORD:${word.id}`,
        prompt: { speechText: word.text, slotCount: word.pieces.length },
        options: stableOrder(
          optionTiles,
          `${input.requestKey}:syllable-options:${word.id}`,
          (tile) => tile.id
        ),
        correctResponse: { syllables: word.pieces, word: word.text }
      };
    });
}

function englishCaseSeeds(input: SessionInput): ItemSeed[] {
  const directions: CaseDirection[] = ["UPPER_TO_LOWER", "LOWER_TO_UPPER"];
  const pool = directions.flatMap((direction) =>
    ENGLISH_ALPHABET.map((letter) => ({ letter, direction }))
  );
  return stableOrder(pool, input.requestKey, (item) => `${item.letter}:${item.direction}`)
    .slice(0, input.requestedCount)
    .map(({ letter, direction }, index) => {
      const promptLetter = direction === "UPPER_TO_LOWER" ? letter : englishLower(letter);
      const answerLetter = direction === "UPPER_TO_LOWER" ? englishLower(letter) : letter;
      const distractors = stableOrder(
        ENGLISH_ALPHABET.filter((candidate) => candidate !== letter),
        `${input.requestKey}:english-case:${index}`,
        (candidate) => candidate
      ).slice(0, 2);
      const options = stableOrder(
        [letter, ...distractors],
        `${input.requestKey}:english-case-options:${index}`,
        (candidate) => candidate
      ).map((candidate) => (direction === "UPPER_TO_LOWER" ? englishLower(candidate) : candidate));
      return {
        targetKey: `EN:${letter}:${direction}`,
        prompt: {
          language: "en-US",
          letter,
          direction,
          promptLetter,
          spokenPrompt: `${promptLetter}, ${answerLetter}`
        },
        options,
        correctResponse: answerLetter
      };
    });
}

function englishVocabularySeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(ENGLISH_PICTURE_WORDS, input.requestKey, (item) => item.word)
    .slice(0, input.requestedCount)
    .map((item, index) => {
      const distractors = stableOrder(
        ENGLISH_PICTURE_WORDS.filter((candidate) => candidate.word !== item.word),
        `${input.requestKey}:english-vocabulary:${index}`,
        (candidate) => candidate.word
      ).slice(0, 2);
      const options = stableOrder(
        [item, ...distractors].map((option) => ({
          id: option.word,
          value: option.word,
          emoji: option.emoji
        })),
        `${input.requestKey}:english-vocabulary-options:${index}`,
        (option) => option.id
      );
      return {
        targetKey: `EN_WORD:${item.word}`,
        prompt: { language: "en-US", speechText: englishLower(item.word) },
        options,
        correctResponse: item.word
      };
    });
}

function englishInitialSoundSeeds(input: SessionInput): ItemSeed[] {
  const initials = [...new Set(ENGLISH_PICTURE_WORDS.map((item) => item.word[0]))];
  return stableOrder(ENGLISH_PICTURE_WORDS, input.requestKey, (item) => item.word)
    .slice(0, input.requestedCount)
    .map((item, index) => {
      const expected = item.word[0];
      const distractors = stableOrder(
        initials.filter((letter) => letter !== expected),
        `${input.requestKey}:english-initial:${index}`,
        (letter) => letter
      ).slice(0, 2);
      return {
        targetKey: `EN_INITIAL:${item.word}`,
        prompt: {
          language: "en-US",
          speechText: englishLower(item.word),
          emoji: item.emoji
        },
        options: stableOrder(
          [expected, ...distractors],
          `${input.requestKey}:english-initial-options:${index}`,
          (letter) => letter
        ),
        correctResponse: expected
      };
    });
}

function englishCvcSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(ENGLISH_CVC_WORDS, input.requestKey, (item) => item.word)
    .slice(0, input.requestedCount)
    .map((item, index) => {
      const letters = Array.from(item.word);
      const tiles = stableOrder(
        letters.map((value, position) => ({ id: `${position}-${value}`, value })),
        `${input.requestKey}:english-cvc:${index}`,
        (tile) => tile.id
      );
      return {
        targetKey: `EN_CVC:${item.word}`,
        prompt: {
          language: "en-US",
          speechText: englishLower(item.word),
          emoji: item.emoji,
          slotCount: letters.length
        },
        options: tiles,
        correctResponse: { letters, word: item.word, emoji: item.emoji }
      };
    });
}

function englishSightWordSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(ENGLISH_SIGHT_WORDS, input.requestKey, (word) => word)
    .slice(0, input.requestedCount)
    .map((word, index) => {
      const distractors = stableOrder(
        ENGLISH_SIGHT_WORDS.filter((candidate) => candidate !== word),
        `${input.requestKey}:english-sight:${index}`,
        (candidate) => candidate
      ).slice(0, 2);
      return {
        targetKey: `EN_SIGHT:${word}`,
        prompt: { language: "en-US", speechText: englishLower(word) },
        options: stableOrder(
          [word, ...distractors],
          `${input.requestKey}:english-sight-options:${index}`,
          (candidate) => candidate
        ),
        correctResponse: word
      };
    });
}

function mathNumberOptions(expected: number, maximum: number, key: string) {
  const candidates = Array.from({ length: maximum + 1 }, (_, value) => value).filter(
    (value) => value !== expected
  );
  return stableOrder(
    [expected, ...stableOrder(candidates, `${key}:distractors`, String).slice(0, 2)],
    `${key}:options`,
    String
  ).map(String);
}

function mathNumberQuantitySeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(MATH_NUMBERS.slice(1), input.requestKey, String)
    .slice(0, input.requestedCount)
    .map((number, index) => {
      const options = mathNumberOptions(number, 10, `${input.requestKey}:quantity:${index}`).map(
        (value) => ({ id: `quantity-${value}`, value, count: Number(value) })
      );
      return {
        targetKey: `MATH_QUANTITY:${number}`,
        prompt: { number },
        options,
        correctResponse: String(number)
      };
    });
}

function mathCountSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(
    MATH_COUNT_CHALLENGES,
    input.requestKey,
    (challenge) => `${challenge.count}:${challenge.emoji}`
  )
    .slice(0, input.requestedCount)
    .map((challenge, index) => ({
      targetKey: `MATH_COUNT:${challenge.count}:${challenge.emoji}`,
      prompt: challenge,
      options: mathNumberOptions(challenge.count, 10, `${input.requestKey}:count:${index}`),
      correctResponse: String(challenge.count)
    }));
}

function mathComparisonSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(MATH_COMPARISONS, input.requestKey, (pair) => pair.join(":"))
    .slice(0, input.requestedCount)
    .map(([left, right], index) => ({
      targetKey: `MATH_COMPARE:${left}:${right}`,
      prompt: {
        left,
        right,
        emoji: MATH_OBJECTS[index % MATH_OBJECTS.length]
      },
      options: ["LEFT", "SAME", "RIGHT"],
      correctResponse: left === right ? "SAME" : left > right ? "LEFT" : "RIGHT"
    }));
}

function mathSequenceSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(MATH_SEQUENCES, input.requestKey, (sequence) => sequence.values.join(":"))
    .slice(0, input.requestedCount)
    .map((sequence, index) => ({
      targetKey: `MATH_SEQUENCE:${sequence.values.join(":")}:${sequence.missingIndex}`,
      prompt: sequence,
      options: mathNumberOptions(sequence.answer, 21, `${input.requestKey}:sequence:${index}`),
      correctResponse: String(sequence.answer)
    }));
}

function mathOperationSeeds(input: SessionInput, operation: "ADD" | "SUBTRACT"): ItemSeed[] {
  const source = operation === "ADD" ? MATH_ADDITIONS : MATH_SUBTRACTIONS;
  const symbol = operation === "ADD" ? "+" : "−";
  return stableOrder(source, input.requestKey, ({ left, right }) => `${left}:${right}`)
    .slice(0, input.requestedCount)
    .map(({ left, right }, index) => {
      const answer = operation === "ADD" ? left + right : left - right;
      return {
        targetKey: `MATH_${operation}:${left}:${right}`,
        prompt: {
          left,
          right,
          operator: symbol,
          emoji: MATH_OBJECTS[index % MATH_OBJECTS.length]
        },
        options: mathNumberOptions(answer, 10, `${input.requestKey}:${operation}:${index}`),
        correctResponse: { answer, equation: `${left} ${symbol} ${right} = ${answer}` }
      };
    });
}

function mathPlaceValueSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(MATH_TWO_DIGIT_NUMBERS, input.requestKey, String)
    .slice(0, input.requestedCount)
    .map((number, index) => ({
      targetKey: `MATH_PLACE_VALUE:${number}`,
      prompt: {
        number,
        tens: Math.floor(number / 10),
        ones: number % 10
      },
      options: mathNumberOptions(number, 99, `${input.requestKey}:place-value:${index}`),
      correctResponse: String(number)
    }));
}

function mathTwoDigitComparisonSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(MATH_TWO_DIGIT_COMPARISONS, input.requestKey, (pair) => pair.join(":"))
    .slice(0, input.requestedCount)
    .map(([left, right]) => ({
      targetKey: `MATH_TWO_DIGIT_COMPARE:${left}:${right}`,
      prompt: { left, right },
      options: [String(left), String(right)],
      correctResponse: String(Math.max(left, right))
    }));
}

function mathTwoDigitOperationSeeds(
  input: SessionInput,
  operation: "ADD" | "SUBTRACT"
): ItemSeed[] {
  const source = operation === "ADD" ? MATH_TWO_DIGIT_ADDITIONS : MATH_TWO_DIGIT_SUBTRACTIONS;
  const symbol = operation === "ADD" ? "+" : "−";
  return stableOrder(source, input.requestKey, ({ left, right }) => `${left}:${right}`)
    .slice(0, input.requestedCount)
    .map(({ left, right }, index) => {
      const answer = operation === "ADD" ? left + right : left - right;
      return {
        targetKey: `MATH_TWO_DIGIT_${operation}:${left}:${right}`,
        prompt: { left, right, operator: symbol },
        options: mathNumberOptions(
          answer,
          99,
          `${input.requestKey}:two-digit:${operation}:${index}`
        ),
        correctResponse: { answer, equation: `${left} ${symbol} ${right} = ${answer}` }
      };
    });
}

function mathStorySeeds(input: SessionInput, operation: "ADD" | "SUBTRACT"): ItemSeed[] {
  const source: readonly { story: string; left: number; right: number; emoji: string }[] =
    operation === "ADD" ? MATH_STORY_ADDITIONS : MATH_STORY_SUBTRACTIONS;
  const symbol = operation === "ADD" ? "+" : "−";
  return stableOrder(source, input.requestKey, (problem) => problem.story)
    .slice(0, input.requestedCount)
    .map((problem, index) => {
      const answer =
        operation === "ADD" ? problem.left + problem.right : problem.left - problem.right;
      return {
        targetKey: `MATH_STORY_${operation}:${problem.left}:${problem.right}`,
        prompt: { ...problem, speechText: problem.story, operator: symbol },
        options: mathNumberOptions(answer, 10, `${input.requestKey}:story:${operation}:${index}`),
        correctResponse: {
          answer,
          equation: `${problem.left} ${symbol} ${problem.right} = ${answer}`
        }
      };
    });
}

function logicShapeSeeds(input: SessionInput): ItemSeed[] {
  const pool = LOGIC_SHAPES.flatMap((shape) => [shape, shape]);
  return stableOrder(pool, input.requestKey, (shape) => shape.shape)
    .slice(0, input.requestedCount)
    .map((shape, index) => {
      const options = stableOrder(
        [
          shape,
          ...stableOrder(
            LOGIC_SHAPES.filter((candidate) => candidate.shape !== shape.shape),
            `${input.requestKey}:shape-d:${index}`,
            (candidate) => candidate.shape
          ).slice(0, 2)
        ],
        `${input.requestKey}:shape-o:${index}`,
        (candidate) => candidate.shape
      ).map((candidate) => ({
        id: candidate.shape,
        value: candidate.shape,
        label: candidate.label,
        color: candidate.color,
        shape: candidate.shape
      }));
      return {
        targetKey: `LOGIC_SHAPE:${shape.shape}:${index}`,
        prompt: { label: shape.label },
        options,
        correctResponse: shape.shape
      };
    });
}

function logicSortSeeds(input: SessionInput): ItemSeed[] {
  return stableOrder(LOGIC_SORT_CHALLENGES, input.requestKey, (challenge) => challenge.rule)
    .slice(0, input.requestedCount)
    .map((challenge, index) => {
      const choices: readonly { value: string; label: string; emoji: string }[] = challenge.options;
      return {
        targetKey: `LOGIC_SORT:${index}:${challenge.answer}`,
        prompt: { question: challenge.rule, speechText: challenge.rule },
        options: stableOrder(
          choices,
          `${input.requestKey}:sort:${index}`,
          (option) => option.value
        ).map((option) => ({ ...option, id: option.value })),
        correctResponse: challenge.answer
      };
    });
}

function logicPatternSeeds(input: SessionInput): ItemSeed[] {
  const pool = [...LOGIC_PATTERNS, ...LOGIC_PATTERNS];
  return stableOrder(pool, input.requestKey, (pattern) => pattern.values.join(""))
    .slice(0, input.requestedCount)
    .map((pattern, index) => ({
      targetKey: `LOGIC_PATTERN:${index}:${pattern.answer}`,
      prompt: { values: [...pattern.values] },
      options: stableOrder(pattern.options, `${input.requestKey}:pattern:${index}`, String),
      correctResponse: pattern.answer
    }));
}

function logicPositionSeeds(input: SessionInput): ItemSeed[] {
  const pool = [...LOGIC_POSITIONS, ...LOGIC_POSITIONS, ...LOGIC_POSITIONS, ...LOGIC_POSITIONS];
  return stableOrder(pool, input.requestKey, (position) => position.position)
    .slice(0, input.requestedCount)
    .map((position, index) => ({
      targetKey: `LOGIC_POSITION:${position.position}:${index}`,
      prompt: { position: position.position },
      options: stableOrder(position.options, `${input.requestKey}:position:${index}`, String),
      correctResponse: position.label
    }));
}

function logicMeasureSeeds(input: SessionInput): ItemSeed[] {
  const pool = [...LOGIC_MEASURES, ...LOGIC_MEASURES, ...LOGIC_MEASURES, ...LOGIC_MEASURES];
  return stableOrder(pool, input.requestKey, (measure) => `${measure.question}:${measure.left}`)
    .slice(0, input.requestedCount)
    .map((measure, index) => ({
      targetKey: `LOGIC_MEASURE:${index}:${measure.answer}`,
      prompt: { ...measure },
      options: ["LEFT", "RIGHT"],
      correctResponse: measure.answer
    }));
}

function storySeeds(input: SessionInput): ItemSeed[] {
  const kind = input.activityType.replace("STORY_", "").toLocaleLowerCase("en-US") as
    | "character"
    | "setting"
    | "sequence"
    | "comprehension"
    | "vocabulary";
  return stableOrder(STORY_CHALLENGES, input.requestKey, (story) => story.id)
    .slice(0, input.requestedCount)
    .map((story) => {
      const challenge = kind === "sequence" ? story.first : story[kind];
      const question =
        kind === "character"
          ? "¿Quién es el personaje principal?"
          : kind === "setting"
            ? "¿Dónde sucede la historia?"
            : kind === "sequence"
              ? "¿Qué pasó primero?"
              : kind === "vocabulary"
                ? story.vocabulary.question
                : story.comprehension.question;
      return {
        targetKey: `STORY:${story.id}:${kind}`,
        prompt: {
          title: story.title,
          story: story.story,
          speechText: story.story,
          scenes: [...story.scenes],
          question,
          word: kind === "vocabulary" ? story.vocabulary.word : undefined
        },
        options: challenge.options.map((option) => ({ ...option, id: option.value })),
        correctResponse: challenge.answer
      };
    });
}

async function learningSeeds(
  input: SessionInput,
  profile: { practiceName: string | null; nameActivityEnabled: boolean }
) {
  switch (input.activityType) {
    case "CASE_MATCH":
      return caseSeeds(input);
    case "NAME_TILES":
      return nameSeeds(input, profile);
    case "SYLLABLE_COUNT":
      return syllableSeeds(input);
    case "INITIAL_SOUND":
      return initialSoundSeeds(input);
    case "SYLLABLE_BUILD":
      return syllableBuildSeeds(input);
    case "ENGLISH_CASE_MATCH":
      return englishCaseSeeds(input);
    case "ENGLISH_VOCABULARY":
      return englishVocabularySeeds(input);
    case "ENGLISH_INITIAL_SOUND":
      return englishInitialSoundSeeds(input);
    case "ENGLISH_CVC_BUILD":
      return englishCvcSeeds(input);
    case "ENGLISH_SIGHT_WORD":
      return englishSightWordSeeds(input);
    case "MATH_NUMBER_QUANTITY":
      return mathNumberQuantitySeeds(input);
    case "MATH_COUNT_OBJECTS":
      return mathCountSeeds(input);
    case "MATH_COMPARE_QUANTITIES":
      return mathComparisonSeeds(input);
    case "MATH_NUMBER_SEQUENCE":
      return mathSequenceSeeds(input);
    case "MATH_ADDITION":
      return mathOperationSeeds(input, "ADD");
    case "MATH_SUBTRACTION":
      return mathOperationSeeds(input, "SUBTRACT");
    case "MATH_PLACE_VALUE":
      return mathPlaceValueSeeds(input);
    case "MATH_COMPARE_TWO_DIGIT":
      return mathTwoDigitComparisonSeeds(input);
    case "MATH_ADDITION_TWO_DIGIT":
      return mathTwoDigitOperationSeeds(input, "ADD");
    case "MATH_SUBTRACTION_TWO_DIGIT":
      return mathTwoDigitOperationSeeds(input, "SUBTRACT");
    case "MATH_STORY_ADDITION":
      return mathStorySeeds(input, "ADD");
    case "MATH_STORY_SUBTRACTION":
      return mathStorySeeds(input, "SUBTRACT");
    case "LOGIC_SHAPE":
      return logicShapeSeeds(input);
    case "LOGIC_SORT":
      return logicSortSeeds(input);
    case "LOGIC_PATTERN":
      return logicPatternSeeds(input);
    case "LOGIC_POSITION":
      return logicPositionSeeds(input);
    case "LOGIC_MEASURE":
      return logicMeasureSeeds(input);
    case "STORY_CHARACTER":
    case "STORY_SETTING":
    case "STORY_SEQUENCE":
    case "STORY_COMPREHENSION":
    case "STORY_VOCABULARY":
      return storySeeds(input);
  }
}

export async function createLearningSession(input: SessionInput) {
  const existing = await prisma.learningActivitySession.findUnique({
    where: { requestKey: input.requestKey },
    include: sessionInclude
  });
  if (existing) return serializeLearningSession(existing);
  const profile = await prisma.childProfile.findFirst({
    where: { id: input.childProfileId, active: true }
  });
  if (!profile) throw new Error("Perfil no encontrado.");
  const seeds = await learningSeeds(input, profile);
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
  const session = await prisma.learningActivitySession.findUnique({
    where: { id },
    include: sessionInclude
  });
  if (!session) throw new Error("Sesión no encontrada.");
  return serializeLearningSession(session);
}

export function serializeLearningSession(
  session: Prisma.LearningActivitySessionGetPayload<{ include: typeof sessionInclude }>
) {
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
        hint:
          item.helpUsed && !answered && session.activityType !== "SYLLABLE_COUNT"
            ? item.correctResponse
            : null,
        media: item.word
          ? {
              imageUrl: item.word?.imagePath ? `/api/media/${item.word.imagePath}` : null,
              audioUrl: item.word?.audioPath ? `/api/media/${item.word.audioPath}` : null
            }
          : null
      };
    })
  };
}

function responseMatches(
  type: LearningActivityType,
  correctValue: Prisma.JsonValue,
  response: Prisma.JsonValue
) {
  if (
    type === "CASE_MATCH" ||
    type === "INITIAL_SOUND" ||
    type === "ENGLISH_CASE_MATCH" ||
    type === "ENGLISH_VOCABULARY" ||
    type === "ENGLISH_INITIAL_SOUND" ||
    type === "ENGLISH_SIGHT_WORD" ||
    type === "MATH_NUMBER_QUANTITY" ||
    type === "MATH_COUNT_OBJECTS" ||
    type === "MATH_COMPARE_QUANTITIES" ||
    type === "MATH_NUMBER_SEQUENCE" ||
    type === "MATH_PLACE_VALUE" ||
    type === "MATH_COMPARE_TWO_DIGIT" ||
    type.startsWith("LOGIC_") ||
    type.startsWith("STORY_")
  )
    return jsonString(correctValue) === jsonString(response);
  const correct = jsonObject(correctValue);
  if (type === "NAME_TILES") {
    const expected = jsonStrings(correct.tileIds);
    const selected = jsonStrings(response);
    return (
      expected.length === selected.length && expected.every((id, index) => id === selected[index])
    );
  }
  if (type === "SYLLABLE_BUILD" || type === "ENGLISH_CVC_BUILD") {
    const expected = jsonStrings(type === "SYLLABLE_BUILD" ? correct.syllables : correct.letters);
    const selected = jsonStrings(response);
    return (
      expected.length === selected.length &&
      expected.every((syllable, index) => syllable === selected[index])
    );
  }
  if (
    type === "MATH_ADDITION" ||
    type === "MATH_SUBTRACTION" ||
    type === "MATH_ADDITION_TWO_DIGIT" ||
    type === "MATH_SUBTRACTION_TWO_DIGIT" ||
    type === "MATH_STORY_ADDITION" ||
    type === "MATH_STORY_SUBTRACTION"
  ) {
    return Number(correct.answer) === Number(response);
  }
  return Number(correct.count) === Number(response);
}

async function updateOneProgress(
  tx: Prisma.TransactionClient,
  data: {
    childProfileId: string;
    activityType: LearningActivityType;
    skillKey: string;
    mode: string;
    outcome: AnswerOutcome;
    sessionId: string;
  }
) {
  const key = {
    childProfileId: data.childProfileId,
    activityType: data.activityType,
    skillKey: data.skillKey,
    mode: data.mode
  };
  const current = await tx.activitySkillProgress.findUnique({
    where: { childProfileId_activityType_skillKey_mode: key }
  });
  const attempts = (current?.attempts ?? 0) + 1;
  const correct = (current?.firstTryCorrect ?? 0) + (data.outcome === "CORRECT" ? 1 : 0);
  const errors = (current?.errorCount ?? 0) + (data.outcome === "INCORRECT" ? 1 : 0);
  const assisted = (current?.assistedCount ?? 0) + (data.outcome === "ASSISTED" ? 1 : 0);
  const skipped = (current?.skippedCount ?? 0) + (data.outcome === "SKIPPED" ? 1 : 0);
  const sessions = (current?.distinctSessions ?? 0) + 1;
  const recentAccuracy = Math.round(((correct + assisted * 0.5) / attempts) * 1000) / 1000;
  await tx.activitySkillProgress.upsert({
    where: { childProfileId_activityType_skillKey_mode: key },
    create: {
      ...key,
      attempts,
      firstTryCorrect: correct,
      errorCount: errors,
      assistedCount: assisted,
      skippedCount: skipped,
      distinctSessions: sessions,
      recentAccuracy,
      state: progressState(attempts, correct, sessions),
      lastPracticedAt: new Date()
    },
    update: {
      attempts,
      firstTryCorrect: correct,
      errorCount: errors,
      assistedCount: assisted,
      skippedCount: skipped,
      distinctSessions: sessions,
      recentAccuracy,
      state: progressState(attempts, correct, sessions),
      lastPracticedAt: new Date()
    }
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
      if (!item.outcome)
        await tx.learningActivityItem.update({ where: { id: item.id }, data: { helpUsed: true } });
      return;
    }
    if (item.outcome) return;
    const outcome: AnswerOutcome =
      input.action === "SKIP"
        ? "SKIPPED"
        : responseMatches(
              item.session.activityType,
              item.correctResponse,
              input.response as Prisma.JsonValue
            )
          ? item.helpUsed
            ? "ASSISTED"
            : "CORRECT"
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
        incorrectPositions: input.response
          .map((_, position) => position)
          .filter((position) => !correctPositions.includes(position))
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
      skillKey:
        item.session.activityType === "CASE_MATCH"
          ? item.targetKey.split(":")[0]
          : item.session.activityType === "NAME_TILES"
            ? "NAME"
            : item.targetKey,
      mode,
      outcome,
      sessionId: item.sessionId
    });
    if (item.session.activityType === "SYLLABLE_COUNT") {
      await updateOneProgress(tx, {
        childProfileId: item.session.childProfileId,
        activityType: item.session.activityType,
        skillKey: `COUNT:${Number(correct.count)}`,
        mode: "COUNT",
        outcome,
        sessionId: item.sessionId
      });
    }
    const pending = await tx.learningActivityItem.count({
      where: { sessionId: input.sessionId, outcome: null }
    });
    if (!pending) {
      const correctCount = await tx.learningActivityItem.count({
        where: { sessionId: input.sessionId, outcome: { in: ["CORRECT", "ASSISTED"] } }
      });
      await tx.learningActivitySession.update({
        where: { id: input.sessionId },
        data: { status: SessionStatus.COMPLETED, completedAt: new Date(), score: correctCount }
      });
    }
  });
  return getLearningSession(input.sessionId);
}

export async function reviewLearningSession(sessionId: string, requestKey: string) {
  const existing = await prisma.learningActivitySession.findUnique({
    where: { requestKey },
    include: sessionInclude
  });
  if (existing) return serializeLearningSession(existing);
  const source = await prisma.learningActivitySession.findUnique({
    where: { id: sessionId },
    include: { items: { where: { outcome: { in: ["INCORRECT", "SKIPPED"] } } } }
  });
  if (!source) throw new Error("Sesión no encontrada.");
  if (!source.items.length) throw new Error("No hay elementos para repasar.");
  const created = await prisma.learningActivitySession.create({
    data: {
      childProfileId: source.childProfileId,
      activityType: source.activityType,
      mode: source.mode,
      requestedCount: source.items.length,
      actualCount: source.items.length,
      requestKey,
      categoryId: source.categoryId,
      difficulty: source.difficulty,
      reviewOfSessionId: source.id,
      items: {
        create: source.items.map((item, position) => ({
          position,
          wordId: item.wordId,
          targetKey: `${item.targetKey}:review`,
          prompt: item.prompt as Prisma.InputJsonValue,
          options: item.options as Prisma.InputJsonValue,
          correctResponse: item.correctResponse as Prisma.InputJsonValue
        }))
      }
    },
    include: sessionInclude
  });
  return serializeLearningSession(created);
}
