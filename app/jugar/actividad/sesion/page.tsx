import { Suspense } from "react";
import ActivityPlayer from "./player";

export default function ActivitySessionPage() {
  return <Suspense fallback={<main className="game-shell"><p>Preparando actividad…</p></main>}><ActivityPlayer /></Suspense>;
}
