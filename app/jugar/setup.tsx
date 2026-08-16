"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Blocks,
  BookOpenText,
  CaseUpper,
  CircleDot,
  Ear,
  Headphones,
  Hash,
  ListOrdered,
  LetterText,
  Map,
  PencilLine,
  Puzzle,
  ScanText,
  SpellCheck,
  Languages,
  Minus,
  Plus,
  Scale,
  Tally5,
  Shapes,
  Boxes,
  GalleryHorizontalEnd,
  Move,
  Ruler,
  ShoppingBasket,
  Cookie,
  Users,
  MapPin,
  MessageCircleQuestion,
  LockKeyhole,
  type LucideIcon
} from "lucide-react";
import {
  ACTIVITY_LEVELS,
  ENGLISH_ACTIVITY_LEVELS,
  MATH_ACTIVITY_LEVELS,
  LOGIC_ACTIVITY_LEVELS,
  STORY_ACTIVITY_LEVELS,
  activitiesForLevel,
  activityHref,
  englishActivitiesForLevel,
  mathActivitiesForLevel,
  logicActivitiesForLevel,
  storyActivitiesForLevel,
  type ActivityCatalogItem
} from "@/lib/activity-catalog";
import { createClientUuid } from "@/lib/client-uuid";

type Profile = {
  id: string;
  nickname: string;
  avatar: string | null;
  practiceName: string | null;
  nameActivityEnabled: boolean;
};

const activityIcons: Record<string, LucideIcon> = {
  AudioLines,
  Blocks,
  CaseUpper,
  CircleDot,
  Ear,
  Headphones,
  Hash,
  ListOrdered,
  LetterText,
  Languages,
  Minus,
  Plus,
  PencilLine,
  Puzzle,
  ScanText,
  SpellCheck,
  Scale,
  Tally5,
  BookOpenText,
  Shapes,
  Boxes,
  GalleryHorizontalEnd,
  Move,
  Ruler,
  ShoppingBasket,
  Cookie,
  Users,
  MapPin,
  MessageCircleQuestion
};

function ActivityCard({
  activity,
  onLaunch,
  locked = false
}: {
  activity: ActivityCatalogItem;
  onLaunch: (activity: ActivityCatalogItem) => void;
  locked?: boolean;
}) {
  const Icon = activityIcons[activity.icon];
  const naturalCount =
    activity.id === "NAME_TILES"
      ? "1 nombre completo"
      : activity.id === "TRACE_LETTER" || activity.id === "ENGLISH_TRACE"
        ? activity.id === "ENGLISH_TRACE"
          ? "3 traces"
          : "3 trazos"
        : activity.count && activity.count >= 20
          ? `hasta ${activity.count} retos`
          : `${activity.count} retos`;

  return (
    <button
      className="level-activity-card"
      style={
        {
          "--activity-background": activity.background,
          "--activity-foreground": activity.foreground
        } as React.CSSProperties
      }
      type="button"
      disabled={locked}
      onClick={() => onLaunch(activity)}
    >
      <span className="level-activity-icon" aria-hidden="true">
        <Icon strokeWidth={2.4} />
      </span>
      <span className="level-activity-copy">
        <strong>{activity.title}</strong>
        <small>{activity.description}</small>
      </span>
      <span className="level-activity-meta">{naturalCount}</span>
      <span className="level-activity-arrow" aria-hidden="true">
        {locked ? <LockKeyhole /> : "→"}
      </span>
    </button>
  );
}

export default function GameSetup({
  profile,
  area,
  progress
}: {
  profile: Profile;
  area: "es" | "en" | "math" | "logic" | "stories";
  progress: Array<{
    activityType: string;
    attempts: number;
    firstTryCorrect: number;
    assistedCount: number;
  }>;
}) {
  const router = useRouter();
  const nameEnabled = Boolean(profile.nameActivityEnabled && profile.practiceName);
  const levels =
    area === "en"
      ? ENGLISH_ACTIVITY_LEVELS
      : area === "math"
        ? MATH_ACTIVITY_LEVELS
        : area === "logic"
          ? LOGIC_ACTIVITY_LEVELS
          : area === "stories"
            ? STORY_ACTIVITY_LEVELS
            : ACTIVITY_LEVELS;

  function activitiesAtLevel(level: ActivityCatalogItem["level"]) {
    return area === "en"
      ? englishActivitiesForLevel(level)
      : area === "math"
        ? mathActivitiesForLevel(level)
        : area === "logic"
          ? logicActivitiesForLevel(level)
          : area === "stories"
            ? storyActivitiesForLevel(level)
            : activitiesForLevel(level, nameEnabled);
  }

  function levelUnlocked(levelIndex: number) {
    if (area === "es" || area === "en" || levelIndex === 0) return true;
    const currentIds = new Set(
      activitiesAtLevel(levels[levelIndex].level).map((activity) => activity.id)
    );
    if (
      progress.some(
        (entry) =>
          currentIds.has(entry.activityType as ActivityCatalogItem["id"]) && entry.attempts > 0
      )
    )
      return true;
    const previousIds = new Set(
      activitiesAtLevel(levels[levelIndex - 1].level).map((activity) => activity.id)
    );
    const previous = progress.filter((entry) =>
      previousIds.has(entry.activityType as ActivityCatalogItem["id"])
    );
    const attempts = previous.reduce((total, entry) => total + entry.attempts, 0);
    const successes = previous.reduce(
      (total, entry) => total + entry.firstTryCorrect + entry.assistedCount,
      0
    );
    return attempts >= 5 && successes / attempts >= 0.6;
  }

  function launch(activity: ActivityCatalogItem) {
    router.push(activityHref(activity, profile.id, createClientUuid()));
  }

  return (
    <main className="activity-menu shell">
      <header className="activity-menu-header">
        <Link className="brand" href="/" aria-label="Cambiar jugador">
          <span className="brand-mark">よ</span> Yomu
        </Link>
        <Link className="change-player-link" href="/">
          Cambiar jugador
        </Link>
      </header>

      <section className="activity-menu-intro">
        <span className="selected-profile-avatar" aria-hidden="true">
          {profile.avatar || "🌱"}
        </span>
        <div>
          <p className="eyebrow">¡Hola, {profile.nickname}!</p>
          <h1 className="page-title">
            {area === "en"
              ? "Let’s learn English!"
              : area === "math"
                ? "¡Juguemos con números!"
                : area === "logic"
                  ? "¡Miremos, pensemos y descubramos!"
                  : area === "stories"
                    ? "¡Es hora de un cuento!"
                    : "¿Qué quieres practicar?"}
          </h1>
          <p>
            {area === "en"
              ? "Escucha, juega y aprende tus primeras palabras en inglés."
              : area === "math"
                ? "Cuenta, compara y resuelve pequeños retos matemáticos."
                : area === "logic"
                  ? "Explora formas, patrones, posiciones y medidas."
                  : area === "stories"
                    ? "Escucha historias cortas y juega a comprenderlas."
                    : "Elige una actividad. Ya está preparada para comenzar."}
          </p>
        </div>
      </section>

      <nav className="language-switcher" aria-label="Área de práctica">
        <Link
          className={area === "es" ? "selected" : ""}
          aria-current={area === "es" ? "page" : undefined}
          href={`/jugar?perfil=${profile.id}`}
        >
          <span aria-hidden="true">📚</span>
          Lectura
        </Link>
        <Link
          className={area === "en" ? "selected" : ""}
          aria-current={area === "en" ? "page" : undefined}
          href={`/jugar?perfil=${profile.id}&idioma=en`}
        >
          <span aria-hidden="true">🌎</span>
          English
        </Link>
        <Link
          className={area === "math" ? "selected" : ""}
          aria-current={area === "math" ? "page" : undefined}
          href={`/jugar?perfil=${profile.id}&materia=matematicas`}
        >
          <span aria-hidden="true">🧮</span>
          Matemáticas
        </Link>
        <Link
          className={area === "logic" ? "selected" : ""}
          aria-current={area === "logic" ? "page" : undefined}
          href={`/jugar?perfil=${profile.id}&materia=logica`}
        >
          <span aria-hidden="true">🧩</span>
          Lógica
        </Link>
        <Link
          className={area === "stories" ? "selected" : ""}
          aria-current={area === "stories" ? "page" : undefined}
          href={`/jugar?perfil=${profile.id}&materia=cuentos`}
        >
          <span aria-hidden="true">📖</span>
          Cuentos
        </Link>
      </nav>

      {area === "es" && (
        <button
          className="recommended-route-card"
          type="button"
          onClick={() => router.push(`/jugar/ruta?perfil=${profile.id}&minutos=10`)}
        >
          <span className="recommended-route-icon" aria-hidden="true">
            <Map strokeWidth={2.2} />
          </span>
          <span>
            <small>Ruta recomendada</small>
            <strong>Sorpréndeme con una aventura</strong>
            <span>10 juegos mezclados · lista para jugar</span>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      )}

      <div className="activity-levels">
        {levels.map((level, levelIndex) => {
          const activities = activitiesAtLevel(level.level);
          const unlocked = levelUnlocked(levelIndex);
          return (
            <section
              className={`activity-level activity-level-${level.level}`}
              aria-labelledby={`level-${level.level}-title`}
              key={level.level}
            >
              <header className="activity-level-header">
                <span className="activity-level-number" style={{ background: level.color }}>
                  {level.level}
                </span>
                <div>
                  <p>
                    Nivel {level.level} · {level.countLabel}
                  </p>
                  <h2 id={`level-${level.level}-title`}>{level.title}</h2>
                  <span>{level.description}</span>
                </div>
              </header>
              <div className="level-activity-grid">
                {activities.map((activity) => (
                  <ActivityCard
                    activity={activity}
                    onLaunch={launch}
                    locked={!unlocked}
                    key={activity.id}
                  />
                ))}
              </div>
              {!unlocked && (
                <p className="level-lock-note">
                  <LockKeyhole aria-hidden="true" /> Completa 5 retos del nivel anterior con al
                  menos 60% de aciertos para abrir este nivel.
                </p>
              )}
              {area === "es" && level.level === 1 && !nameEnabled && (
                <p className="name-activity-note">
                  Un adulto puede activar “Construye tu nombre” desde el perfil.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
