import { expect, test, type Page } from "@playwright/test";
import { createSessionToken } from "../lib/security";

async function adminLogin(page: Page) {
  if (process.env.E2E_ADMIN_ID) {
    await page.context().addCookies([
      {
        name: "yomu_admin",
        value: createSessionToken(process.env.E2E_ADMIN_ID),
        url: "http://127.0.0.1:3000"
      }
    ]);
    return;
  }
  const login = await page.request.post("/api/admin/login", {
    data: { email: "admin@yomu.local", password: "cambia-esta-contrasena" }
  });
  expect(login.ok()).toBe(true);
}

function baseTarget(position = 0, expectedPiece: string | null = null) {
  return {
    id: crypto.randomUUID(),
    position,
    expectedPiece,
    selectedPiece: null,
    outcome: null,
    helpUsed: false,
    answeredAt: null
  };
}

function journeyPayload(type: "INITIAL_SOUND" | "TRACE_LETTER" = "INITIAL_SOUND") {
  return {
    journeyId: crypto.randomUUID(),
    dateKey: "2026-08-10",
    durationMinutes: 5,
    status: "ACTIVE",
    child: { id: crypto.randomUUID(), nickname: "Luna", avatar: "🌱" },
    reward: null,
    activities: [
      {
        id: crypto.randomUUID(),
        type,
        position: 0,
        wordText: type === "INITIAL_SOUND" ? "MAPA" : null,
        imageUrl: null,
        audioUrl: null,
        options: type === "INITIAL_SOUND" ? ["M", "P", "L"] : [],
        outcome: null,
        targets: [baseTarget(0, type === "TRACE_LETTER" ? "M" : null)]
      }
    ],
    summary: {
      correct: 0,
      incorrect: 0,
      assisted: 0,
      skipped: 0,
      total: 1,
      strengths: [],
      practice: [],
      recommendation: "Practiquen con calma."
    }
  };
}

async function mockRoute(page: Page, type: "INITIAL_SOUND" | "TRACE_LETTER" = "INITIAL_SOUND") {
  const payload = journeyPayload(type);
  await page.route("**/api/daily", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) })
  );
  await page.route("**/api/daily/*/answer", async (route) => {
    const body = route.request().postDataJSON();
    const correct = type === "TRACE_LETTER" || body.selectedPiece === "M";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        target: {
          ...payload.activities[0].targets[0],
          expectedPiece: "M",
          selectedPiece: type === "TRACE_LETTER" ? "TRAZO" : body.selectedPiece,
          outcome: correct ? "CORRECT" : "INCORRECT",
          answeredAt: new Date().toISOString()
        },
        alreadyRecorded: false,
        activityComplete: correct,
        activityOutcome: correct ? "CORRECT" : "INCORRECT"
      })
    });
  });
  await page.route("**/api/daily/*/complete", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...payload,
        status: "COMPLETED",
        reward: { name: "Semilla curiosa", icon: "🌰", stage: 1 },
        summary: { ...payload.summary, correct: 1, strengths: ["M"] }
      })
    })
  );
  await page.goto(`/jugar/ruta?perfil=${payload.child.id}`);
  return payload;
}

test("la ruta diaria mantiene controles táctiles y no desborda los viewports", async ({ page }) => {
  await mockRoute(page);
  await expect(page.getByRole("heading", { name: "¿Con qué sonido comienza?" })).toBeVisible();
  const optionBox = await page.getByRole("button", { name: "M", exact: true }).boundingBox();
  const helpBox = await page.getByRole("button", { name: "Ayuda" }).boundingBox();
  expect(optionBox!.height).toBeGreaterThanOrEqual(64);
  expect(helpBox!.height).toBeGreaterThanOrEqual(64);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("el menú ofrece una ruta recomendada sin configuración previa", async ({ page }) => {
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await expect(page.getByRole("button", { name: /Sorpréndeme con una aventura/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("el sonido incorrecto se bloquea y revela el correcto sin celebrar", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await mockRoute(page);
  await page.getByRole("button", { name: "P", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByText(/Esta vez era M/)).toBeVisible();
  await expect(page.getByRole("button", { name: "M", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "M", exact: true })).toHaveClass(/correct-option/);
  await expect(page.getByText(/Muy bien/)).toHaveCount(0);
});

test("el trazado con el dedo completa la ruta y entrega una recompensa tranquila", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await mockRoute(page, "TRACE_LETTER");
  const canvas = page.getByLabel("Traza la letra M");
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 80, box!.y + 210);
  await page.mouse.down();
  for (let step = 0; step < 18; step += 1) {
    await page.mouse.move(box!.x + 80 + step * 8, box!.y + 210 - step * 7);
  }
  await page.mouse.up();
  await page.getByRole("button", { name: "¡Listo!" }).click();
  await expect(page.getByRole("heading", { name: /jardín sigue creciendo/ })).toBeVisible();
  await expect(page.getByText("Semilla curiosa")).toBeVisible();
  await expect(page.getByText("Para el adulto")).toBeVisible();
});

test("la API crea cinco actividades, reanuda el día y persiste ayuda, trazado y recompensa", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  const profileResponse = await page.request.post("/api/admin/profiles", {
    data: { nickname: `E2E Ruta ${Date.now()}`, avatar: "🧪" }
  });
  expect(profileResponse.status()).toBe(201);
  const profile = await profileResponse.json();
  const first = await page.request.post("/api/daily", { data: { childProfileId: profile.id } });
  expect(first.ok()).toBe(true);
  const journey = await first.json();
  expect(journey.activities).toHaveLength(5);
  expect(journey.activities.map((activity: { type: string }) => activity.type)).toEqual([
    "INITIAL_SOUND",
    "INITIAL_SOUND",
    "SYLLABLE_BUILD",
    "SYLLABLE_BUILD",
    "TRACE_LETTER"
  ]);
  const extended = await page.request.post("/api/daily", {
    data: { childProfileId: profile.id, durationMinutes: 10 }
  });
  expect(extended.ok()).toBe(true);
  const extendedJourney = await extended.json();
  expect(extendedJourney).toMatchObject({ durationMinutes: 10 });
  expect(extendedJourney.activities).toHaveLength(10);
  expect(
    extendedJourney.activities.filter(
      (activity: { type: string }) => activity.type === "INITIAL_SOUND"
    )
  ).toHaveLength(4);
  expect(
    extendedJourney.activities.filter(
      (activity: { type: string }) => activity.type === "SYLLABLE_BUILD"
    )
  ).toHaveLength(4);
  expect(
    extendedJourney.activities.filter(
      (activity: { type: string }) => activity.type === "TRACE_LETTER"
    )
  ).toHaveLength(2);
  const resumed = await page.request.post("/api/daily", { data: { childProfileId: profile.id } });
  expect((await resumed.json()).journeyId).toBe(journey.journeyId);

  let firstAssistedTarget: { activityId: string; position: number; option: string } | null = null;
  for (const activity of journey.activities) {
    for (const target of activity.targets) {
      const action = activity.type === "TRACE_LETTER" ? "TRACE" : "HELP";
      const answer = await page.request.post(`/api/daily/${journey.journeyId}/answer`, {
        data: {
          activityId: activity.id,
          position: target.position,
          action,
          tracePoints: action === "TRACE" ? 20 : undefined,
          responseTimeMs: 100
        }
      });
      expect(answer.ok()).toBe(true);
      const result = await answer.json();
      expect(result.target.outcome).toBe(action === "TRACE" ? "CORRECT" : "ASSISTED");
      if (!firstAssistedTarget && action === "HELP") {
        firstAssistedTarget = {
          activityId: activity.id,
          position: target.position,
          option: activity.options[0]
        };
      }
    }
  }
  const immutable = await page.request.post(`/api/daily/${journey.journeyId}/answer`, {
    data: {
      activityId: firstAssistedTarget!.activityId,
      position: firstAssistedTarget!.position,
      action: "ANSWER",
      selectedPiece: firstAssistedTarget!.option,
      responseTimeMs: 200
    }
  });
  expect((await immutable.json()).target.outcome).toBe("ASSISTED");

  const complete = await page.request.post(`/api/daily/${journey.journeyId}/complete`);
  expect(complete.ok()).toBe(true);
  const completed = await complete.json();
  expect(completed).toMatchObject({
    status: "COMPLETED",
    reward: { name: "Semilla curiosa", stage: 1 }
  });
  expect(completed.summary.assisted).toBeGreaterThan(0);
  expect(completed.summary.recommendation).toContain("Practiquen");
});
