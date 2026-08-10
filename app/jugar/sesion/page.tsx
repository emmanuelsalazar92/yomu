import GameSession from "./session";
import { Suspense } from "react";

export const metadata = { title: "Jugando" };
export default function GameSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="result">
          <div className="result-card">
            <h1>Preparando Yomu…</h1>
          </div>
        </main>
      }
    >
      <GameSession />
    </Suspense>
  );
}
