export type ActivityLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type ActivityCatalogItem = {
  id:
    | "TRACE_LETTER"
    | "CASE_MATCH"
    | "NAME_TILES"
    | "INITIAL_SOUND"
    | "INITIAL_VOWEL"
    | "SYLLABLE_COUNT"
    | "SYLLABLE_BUILD"
    | "ONE_VOWEL"
    | "ALL_VOWELS"
    | "SINGLE_CONSONANT"
    | "ENGLISH_TRACE"
    | "ENGLISH_CASE_MATCH"
    | "ENGLISH_VOCABULARY"
    | "ENGLISH_INITIAL_SOUND"
    | "ENGLISH_CVC_BUILD"
    | "ENGLISH_SIGHT_WORD"
    | "MATH_NUMBER_QUANTITY"
    | "MATH_COUNT_OBJECTS"
    | "MATH_COMPARE_QUANTITIES"
    | "MATH_NUMBER_SEQUENCE"
    | "MATH_ADDITION"
    | "MATH_SUBTRACTION"
    | "MATH_PLACE_VALUE"
    | "MATH_COMPARE_TWO_DIGIT"
    | "MATH_ADDITION_TWO_DIGIT"
    | "MATH_SUBTRACTION_TWO_DIGIT"
    | "MATH_STORY_ADDITION"
    | "MATH_STORY_SUBTRACTION"
    | "LOGIC_SHAPE"
    | "LOGIC_SORT"
    | "LOGIC_PATTERN"
    | "LOGIC_POSITION"
    | "LOGIC_MEASURE"
    | "STORY_CHARACTER"
    | "STORY_SETTING"
    | "STORY_SEQUENCE"
    | "STORY_COMPREHENSION"
    | "STORY_VOCABULARY";
  title: string;
  description: string;
  icon: string;
  background: string;
  foreground: string;
  level: ActivityLevel;
  kind: "learning" | "game" | "trace";
  mode?: string;
  count?: 1 | 5 | 10 | 20 | 30;
  language?: "es" | "en";
  subject?: "math" | "logic" | "stories";
};

export const ACTIVITY_LEVELS = [
  {
    level: 1 as const,
    title: "Descubro letras",
    description: "Reconocer, relacionar y dibujar letras conocidas.",
    countLabel: "10 retos",
    color: "#654FA3"
  },
  {
    level: 2 as const,
    title: "Escucho y separo",
    description: "Descubrir sonidos, vocales y golpes de voz.",
    countLabel: "hasta 20 retos",
    color: "#237A69"
  },
  {
    level: 3 as const,
    title: "Formo palabras",
    description: "Completar y construir palabras con menos ayuda.",
    countLabel: "hasta 30 retos",
    color: "#965628"
  }
] as const;

export const ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = [
  {
    id: "TRACE_LETTER",
    title: "Traza una letra",
    description: "Elige una letra y dibújala a tu ritmo.",
    icon: "PencilLine",
    background: "#EEE8FF",
    foreground: "#654FA3",
    level: 1,
    kind: "trace"
  },
  {
    id: "CASE_MATCH",
    title: "Une mayúscula y minúscula",
    description: "Encuentra la pareja de cada letra.",
    icon: "CaseUpper",
    background: "#E5F2FF",
    foreground: "#23679D",
    level: 1,
    kind: "learning",
    mode: "MIXED",
    count: 10
  },
  {
    id: "NAME_TILES",
    title: "Construye tu nombre",
    description: "Ordena las letras de tu nombre.",
    icon: "Puzzle",
    background: "#FFE9F1",
    foreground: "#A8466B",
    level: 1,
    kind: "learning",
    mode: "MIXED",
    count: 1
  },
  {
    id: "INITIAL_SOUND",
    title: "Encuentra el sonido inicial",
    description: "Escucha y elige con qué sonido comienza.",
    icon: "Ear",
    background: "#FFF3C4",
    foreground: "#8A6512",
    level: 2,
    kind: "learning",
    mode: "LISTEN",
    count: 20
  },
  {
    id: "INITIAL_VOWEL",
    title: "Encuentra la vocal inicial",
    description: "Completa la primera vocal de la palabra.",
    icon: "LetterText",
    background: "#FFE8E1",
    foreground: "#A84C35",
    level: 2,
    kind: "game",
    mode: "LISTEN",
    count: 20
  },
  {
    id: "SYLLABLE_COUNT",
    title: "Cuenta las sílabas",
    description: "Escucha y cuenta los golpes de voz.",
    icon: "AudioLines",
    background: "#DFF5F0",
    foreground: "#237A69",
    level: 2,
    kind: "learning",
    mode: "COUNT",
    count: 20
  },
  {
    id: "SYLLABLE_BUILD",
    title: "Construye la palabra",
    description: "Ordena sus sílabas para formarla.",
    icon: "Blocks",
    background: "#E4F4DB",
    foreground: "#447A31",
    level: 3,
    kind: "learning",
    mode: "BUILD",
    count: 30
  },
  {
    id: "ONE_VOWEL",
    title: "Completa una vocal",
    description: "Encuentra la vocal que falta.",
    icon: "CircleDot",
    background: "#E8EEFF",
    foreground: "#3D62A6",
    level: 3,
    kind: "game",
    mode: "WITHOUT_IMAGE",
    count: 30
  },
  {
    id: "ALL_VOWELS",
    title: "Completa todas las vocales",
    description: "Descubre todas las vocales escondidas.",
    icon: "SpellCheck",
    background: "#F0E8FF",
    foreground: "#6843A5",
    level: 3,
    kind: "game",
    mode: "WITHOUT_IMAGE",
    count: 30
  },
  {
    id: "SINGLE_CONSONANT",
    title: "Completa la consonante",
    description: "Elige la consonante que falta.",
    icon: "ScanText",
    background: "#FFEBD7",
    foreground: "#965628",
    level: 3,
    kind: "game",
    mode: "WITHOUT_IMAGE",
    count: 30
  }
] as const;

export const ENGLISH_ACTIVITY_LEVELS = [
  {
    level: 1 as const,
    title: "Hello, English!",
    description: "Conocer las letras inglesas con juegos familiares.",
    countLabel: "10 retos",
    color: "#3568A8"
  },
  {
    level: 2 as const,
    title: "Listen and discover",
    description: "Escuchar palabras y reconocer sus sonidos iniciales.",
    countLabel: "hasta 20 retos",
    color: "#A35B22"
  },
  {
    level: 3 as const,
    title: "My first words",
    description: "Construir palabras cortas y reconocer palabras frecuentes.",
    countLabel: "hasta 30 retos",
    color: "#6A4AA3"
  }
] as const;

export const ENGLISH_ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = [
  {
    id: "ENGLISH_TRACE",
    title: "Trace a letter",
    description: "Traza una letra mientras escuchas su nombre en inglés.",
    icon: "PencilLine",
    background: "#E8F1FF",
    foreground: "#3568A8",
    level: 1,
    kind: "trace",
    language: "en"
  },
  {
    id: "ENGLISH_CASE_MATCH",
    title: "Big and small letters",
    description: "Une la letra mayúscula con su minúscula.",
    icon: "Languages",
    background: "#E8F7F4",
    foreground: "#27786A",
    level: 1,
    kind: "learning",
    mode: "MIXED",
    count: 10,
    language: "en"
  },
  {
    id: "ENGLISH_VOCABULARY",
    title: "Listen and choose",
    description: "Escucha una palabra y elige su dibujo.",
    icon: "Headphones",
    background: "#FFF1D8",
    foreground: "#A35B22",
    level: 2,
    kind: "learning",
    mode: "LISTEN",
    count: 20,
    language: "en"
  },
  {
    id: "ENGLISH_INITIAL_SOUND",
    title: "Beginning sounds",
    description: "Escucha y encuentra la primera letra.",
    icon: "Ear",
    background: "#FFE8E1",
    foreground: "#A84C35",
    level: 2,
    kind: "learning",
    mode: "LISTEN",
    count: 20,
    language: "en"
  },
  {
    id: "ENGLISH_CVC_BUILD",
    title: "Build a word",
    description: "Ordena tres letras para formar una palabra.",
    icon: "Blocks",
    background: "#EEE8FF",
    foreground: "#6A4AA3",
    level: 3,
    kind: "learning",
    mode: "BUILD",
    count: 30,
    language: "en"
  },
  {
    id: "ENGLISH_SIGHT_WORD",
    title: "Sight words",
    description: "Escucha y reconoce palabras muy frecuentes.",
    icon: "BookOpenText",
    background: "#E7F3DF",
    foreground: "#4D793B",
    level: 3,
    kind: "learning",
    mode: "LISTEN",
    count: 30,
    language: "en"
  }
] as const;

export const MATH_ACTIVITY_LEVELS = [
  {
    level: 1 as const,
    title: "Conozco los números",
    description: "Relacionar cada número con una cantidad y contar objetos.",
    countLabel: "10 retos",
    color: "#2F6FA3"
  },
  {
    level: 2 as const,
    title: "Comparo y ordeno",
    description: "Descubrir dónde hay más y completar secuencias.",
    countLabel: "hasta 20 retos",
    color: "#B7672C"
  },
  {
    level: 3 as const,
    title: "Sumo y resto",
    description: "Resolver operaciones pequeñas con apoyo visual.",
    countLabel: "hasta 30 retos",
    color: "#6B4EA1"
  },
  {
    level: 4 as const,
    title: "Números de dos dígitos",
    description: "Comprender decenas y unidades y comparar números hasta 99.",
    countLabel: "hasta 20 retos",
    color: "#397A73"
  },
  {
    level: 5 as const,
    title: "Calculo con dos dígitos",
    description: "Sumar y restar números de dos dígitos paso a paso.",
    countLabel: "hasta 30 retos",
    color: "#A44962"
  },
  {
    level: 6 as const,
    title: "Matemáticas de cada día",
    description: "Resolver pequeños problemas con juguetes, meriendas y paseos.",
    countLabel: "hasta 20 retos",
    color: "#B46A24"
  }
] as const;

export const MATH_ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = [
  {
    id: "MATH_NUMBER_QUANTITY",
    title: "Número y cantidad",
    description: "Une el número con el grupo correcto.",
    icon: "Hash",
    background: "#E5F2FF",
    foreground: "#2F6FA3",
    level: 1,
    kind: "learning",
    mode: "MATCH",
    count: 10,
    subject: "math"
  },
  {
    id: "MATH_COUNT_OBJECTS",
    title: "Cuenta los objetos",
    description: "Cuenta y elige el número correcto.",
    icon: "Tally5",
    background: "#E4F4DB",
    foreground: "#447A31",
    level: 1,
    kind: "learning",
    mode: "COUNT",
    count: 10,
    subject: "math"
  },
  {
    id: "MATH_COMPARE_QUANTITIES",
    title: "¿Dónde hay más?",
    description: "Compara dos grupos de objetos.",
    icon: "Scale",
    background: "#FFF1D8",
    foreground: "#9A5A24",
    level: 2,
    kind: "learning",
    mode: "COMPARE",
    count: 20,
    subject: "math"
  },
  {
    id: "MATH_NUMBER_SEQUENCE",
    title: "El número que falta",
    description: "Completa la secuencia del 0 al 20.",
    icon: "ListOrdered",
    background: "#DFF5F0",
    foreground: "#237A69",
    level: 2,
    kind: "learning",
    mode: "SEQUENCE",
    count: 20,
    subject: "math"
  },
  {
    id: "MATH_ADDITION",
    title: "Mis primeras sumas",
    description: "Junta dos grupos y cuenta el total.",
    icon: "Plus",
    background: "#EEE8FF",
    foreground: "#6B4EA1",
    level: 3,
    kind: "learning",
    mode: "CALCULATE",
    count: 30,
    subject: "math"
  },
  {
    id: "MATH_SUBTRACTION",
    title: "Mis primeras restas",
    description: "Quita objetos y descubre cuántos quedan.",
    icon: "Minus",
    background: "#FFE8E1",
    foreground: "#A84C35",
    level: 3,
    kind: "learning",
    mode: "CALCULATE",
    count: 30,
    subject: "math"
  },
  {
    id: "MATH_PLACE_VALUE",
    title: "Decenas y unidades",
    description: "Descubre el número formado por bloques.",
    icon: "Blocks",
    background: "#E1F3F0",
    foreground: "#397A73",
    level: 4,
    kind: "learning",
    mode: "PLACE_VALUE",
    count: 20,
    subject: "math"
  },
  {
    id: "MATH_COMPARE_TWO_DIGIT",
    title: "¿Cuál número es mayor?",
    description: "Compara números de dos dígitos.",
    icon: "Scale",
    background: "#FFF0CC",
    foreground: "#8D641C",
    level: 4,
    kind: "learning",
    mode: "COMPARE",
    count: 20,
    subject: "math"
  },
  {
    id: "MATH_ADDITION_TWO_DIGIT",
    title: "Sumas de dos dígitos",
    description: "Suma sin llevar hasta 99.",
    icon: "Plus",
    background: "#F2E8FF",
    foreground: "#6B4EA1",
    level: 5,
    kind: "learning",
    mode: "CALCULATE",
    count: 30,
    subject: "math"
  },
  {
    id: "MATH_SUBTRACTION_TWO_DIGIT",
    title: "Restas de dos dígitos",
    description: "Resta sin pedir prestado.",
    icon: "Minus",
    background: "#FFE6EC",
    foreground: "#A44962",
    level: 5,
    kind: "learning",
    mode: "CALCULATE",
    count: 30,
    subject: "math"
  },
  {
    id: "MATH_STORY_ADDITION",
    title: "Problemas para juntar",
    description: "Escucha una historia, junta las cantidades y responde.",
    icon: "ShoppingBasket",
    background: "#FFF1D8",
    foreground: "#9A5A24",
    level: 6,
    kind: "learning",
    mode: "PROBLEM",
    count: 20,
    subject: "math"
  },
  {
    id: "MATH_STORY_SUBTRACTION",
    title: "Problemas para quitar",
    description: "Descubre cuántos quedan después de regalar o usar algunos.",
    icon: "Cookie",
    background: "#FFE8E1",
    foreground: "#A84C35",
    level: 6,
    kind: "learning",
    mode: "PROBLEM",
    count: 20,
    subject: "math"
  }
] as const;

export const LOGIC_ACTIVITY_LEVELS = [
  {
    level: 1 as const,
    title: "Formas y colores",
    description: "Reconocer círculos, cuadrados, triángulos y colores.",
    countLabel: "10 retos",
    color: "#3B76A8"
  },
  {
    level: 2 as const,
    title: "Clasifico",
    description: "Agrupar objetos por una característica visible.",
    countLabel: "10 retos",
    color: "#3D8666"
  },
  {
    level: 3 as const,
    title: "Completo patrones",
    description: "Descubrir qué elemento sigue en una serie.",
    countLabel: "hasta 20 retos",
    color: "#8657A4"
  },
  {
    level: 4 as const,
    title: "Me ubico",
    description: "Practicar arriba, abajo, dentro, fuera, izquierda y derecha.",
    countLabel: "hasta 20 retos",
    color: "#B2632D"
  },
  {
    level: 5 as const,
    title: "Comparo medidas",
    description: "Distinguir largo, corto, alto, bajo, pesado y liviano.",
    countLabel: "hasta 20 retos",
    color: "#A94E68"
  }
] as const;

export const LOGIC_ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = [
  {
    id: "LOGIC_SHAPE",
    title: "Encuentra la forma",
    description: "Mira el modelo y toca la forma correcta.",
    icon: "Shapes",
    background: "#E5F2FF",
    foreground: "#2F6FA3",
    level: 1,
    kind: "learning",
    mode: "SHAPE",
    count: 10,
    subject: "logic"
  },
  {
    id: "LOGIC_SORT",
    title: "¿Cuál pertenece al grupo?",
    description: "Clasifica por color, forma o tipo.",
    icon: "Boxes",
    background: "#E4F4DB",
    foreground: "#447A31",
    level: 2,
    kind: "learning",
    mode: "SORT",
    count: 10,
    subject: "logic"
  },
  {
    id: "LOGIC_PATTERN",
    title: "¿Qué sigue?",
    description: "Completa patrones de dibujos y colores.",
    icon: "GalleryHorizontalEnd",
    background: "#EEE8FF",
    foreground: "#6B4EA1",
    level: 3,
    kind: "learning",
    mode: "PATTERN",
    count: 20,
    subject: "logic"
  },
  {
    id: "LOGIC_POSITION",
    title: "¿Dónde está?",
    description: "Encuentra posiciones y direcciones.",
    icon: "Move",
    background: "#FFF1D8",
    foreground: "#9A5A24",
    level: 4,
    kind: "learning",
    mode: "POSITION",
    count: 20,
    subject: "logic"
  },
  {
    id: "LOGIC_MEASURE",
    title: "Compara y elige",
    description: "Compara tamaño, longitud y peso.",
    icon: "Ruler",
    background: "#FFE9F1",
    foreground: "#A8466B",
    level: 5,
    kind: "learning",
    mode: "MEASURE",
    count: 20,
    subject: "logic"
  }
] as const;

export const STORY_ACTIVITY_LEVELS = [
  {
    level: 1 as const,
    title: "Conozco al personaje",
    description: "Escuchar un cuento corto e identificar quién participa.",
    countLabel: "5 cuentos",
    color: "#3B76A8"
  },
  {
    level: 2 as const,
    title: "Descubro el lugar",
    description: "Reconocer dónde ocurre cada historia.",
    countLabel: "hasta 10 cuentos",
    color: "#3D8666"
  },
  {
    level: 3 as const,
    title: "Ordeno la historia",
    description: "Elegir qué sucedió primero, después y al final.",
    countLabel: "hasta 10 cuentos",
    color: "#8657A4"
  },
  {
    level: 4 as const,
    title: "Pienso y respondo",
    description: "Comprender acciones, causas y emociones.",
    countLabel: "hasta 10 cuentos",
    color: "#B2632D"
  },
  {
    level: 5 as const,
    title: "Aprendo palabras",
    description: "Descubrir palabras nuevas usando el cuento.",
    countLabel: "hasta 10 cuentos",
    color: "#A94E68"
  }
] as const;

export const STORY_ACTIVITY_CATALOG: readonly ActivityCatalogItem[] = [
  {
    id: "STORY_CHARACTER",
    title: "¿Quién aparece?",
    description: "Escucha y encuentra al personaje principal.",
    icon: "Users",
    background: "#E5F2FF",
    foreground: "#2F6FA3",
    level: 1,
    kind: "learning",
    mode: "LISTEN",
    count: 5,
    subject: "stories"
  },
  {
    id: "STORY_SETTING",
    title: "¿Dónde sucede?",
    description: "Escucha y elige el lugar del cuento.",
    icon: "MapPin",
    background: "#E4F4DB",
    foreground: "#447A31",
    level: 2,
    kind: "learning",
    mode: "LISTEN",
    count: 10,
    subject: "stories"
  },
  {
    id: "STORY_SEQUENCE",
    title: "¿Qué pasó primero?",
    description: "Ordena los momentos importantes de la historia.",
    icon: "ListOrdered",
    background: "#EEE8FF",
    foreground: "#6B4EA1",
    level: 3,
    kind: "learning",
    mode: "LISTEN",
    count: 10,
    subject: "stories"
  },
  {
    id: "STORY_COMPREHENSION",
    title: "Detective del cuento",
    description: "Responde por qué pasó algo o cómo se sintieron.",
    icon: "MessageCircleQuestion",
    background: "#FFF1D8",
    foreground: "#9A5A24",
    level: 4,
    kind: "learning",
    mode: "LISTEN",
    count: 10,
    subject: "stories"
  },
  {
    id: "STORY_VOCABULARY",
    title: "Palabra nueva",
    description: "Descubre qué significa una palabra del cuento.",
    icon: "BookOpenText",
    background: "#FFE9F1",
    foreground: "#A8466B",
    level: 5,
    kind: "learning",
    mode: "LISTEN",
    count: 10,
    subject: "stories"
  }
] as const;

export function activitiesForLevel(level: ActivityLevel, nameEnabled = true) {
  return ACTIVITY_CATALOG.filter(
    (activity) => activity.level === level && (nameEnabled || activity.id !== "NAME_TILES")
  );
}

export function activityById(id: string) {
  return [
    ...ACTIVITY_CATALOG,
    ...ENGLISH_ACTIVITY_CATALOG,
    ...MATH_ACTIVITY_CATALOG,
    ...LOGIC_ACTIVITY_CATALOG,
    ...STORY_ACTIVITY_CATALOG
  ].find((activity) => activity.id === id);
}

export function englishActivitiesForLevel(level: ActivityLevel) {
  return ENGLISH_ACTIVITY_CATALOG.filter((activity) => activity.level === level);
}

export function mathActivitiesForLevel(level: ActivityLevel) {
  return MATH_ACTIVITY_CATALOG.filter((activity) => activity.level === level);
}

export function logicActivitiesForLevel(level: ActivityLevel) {
  return LOGIC_ACTIVITY_CATALOG.filter((activity) => activity.level === level);
}

export function storyActivitiesForLevel(level: ActivityLevel) {
  return STORY_ACTIVITY_CATALOG.filter((activity) => activity.level === level);
}

export function activityHref(activity: ActivityCatalogItem, profileId: string, requestKey: string) {
  if (activity.kind === "trace") {
    const language = activity.language === "en" ? "&idioma=en" : "";
    return `/jugar/trazo?perfil=${profileId}&nivel=${activity.level}${language}`;
  }
  const params = new URLSearchParams({
    profile: profileId,
    type: activity.id,
    mode: activity.mode || "MIXED",
    count: String(activity.count || 10),
    requestKey
  });
  if (activity.language) params.set("language", activity.language);
  if (activity.subject) params.set("subject", activity.subject);
  return activity.kind === "game" ? `/jugar/sesion?${params}` : `/jugar/actividad/sesion?${params}`;
}
