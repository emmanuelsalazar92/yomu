import { Suspense } from "react";
import DailyRoute from "./daily-route";

export const metadata = { title: "Mi aventura de hoy" };

export default function DailyRoutePage() {
  return (
    <Suspense fallback={<main className="result"><div className="result-card"><h1>Preparando la aventura…</h1></div></main>}>
      <DailyRoute />
    </Suspense>
  );
}
