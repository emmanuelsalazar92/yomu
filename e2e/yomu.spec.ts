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
  } else {
    const login = await page.request.post("/api/admin/login", {
      data: { email: "admin@yomu.local", password: "cambia-esta-contrasena" }
    });
    expect(login.ok()).toBe(true);
  }
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
}

test("Admin y selector infantil son adaptables en todos los viewports", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/palabras");
  await expect(page.getByRole("heading", { name: "Nueva palabra" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Vocales/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Consonantes/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await expect(page.getByRole("heading", { name: "Descubro letras" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escucho y separo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Formo palabras" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Completa todas las vocales/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Completa la consonante/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("el resultado usa el total real y distingue consonantes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await page.goto("/");
  await page.evaluate(() =>
    sessionStorage.setItem(
      "yomu-result",
      JSON.stringify({
        correct: 2,
        incorrect: 1,
        assisted: 0,
        skipped: 0,
        total: 3,
        words: 3,
        sessionTotal: 3,
        targetKind: "CONSONANT",
        practicedLetters: ["M", "P"],
        difficultLetters: ["P"],
        reviewWords: ["MAPA"]
      })
    )
  );
  await page.goto("/jugar/resultado");
  await expect(page.getByText("3/3 ejercicios completados")).toBeVisible();
  await expect(page.getByText(/Acertaste sin ayuda/)).toContainText("2 de 3");
  await expect(page.locator(".stat", { hasText: "Practicadas:" })).toContainText("M, P");
});

test("consonantes persiste posición y tres opciones únicas durante el refresh", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  await page.goto("/");
  const profileHref = await page.locator(".profile-card").first().getAttribute("href");
  const profileId = new URL(profileHref!, "http://127.0.0.1:3000").searchParams.get("perfil")!;
  const categoryResponse = await page.request.post("/api/admin/categories", {
    data: { name: `E2E consonante ${Date.now()}`, color: "#B9DCCB" }
  });
  expect(categoryResponse.ok()).toBe(true);
  const categoryId = (await categoryResponse.json()).id;
  const suffix = Date.now()
    .toString()
    .replaceAll("0", "B")
    .replaceAll("1", "C")
    .replaceAll("2", "D")
    .replaceAll("3", "F")
    .replaceAll("4", "G")
    .replaceAll("5", "H")
    .replaceAll("6", "J")
    .replaceAll("7", "K")
    .replaceAll("8", "L")
    .replaceAll("9", "M");
  const created = await page.request.post("/api/admin/words", {
    multipart: {
      text: `MAPA${suffix}`,
      categoryId,
      difficulty: "5",
      vowelPositions: "[]",
      consonantPositions: "[0]",
      exerciseTypes: '["SINGLE_CONSONANT"]'
    }
  });
  expect(created.ok()).toBe(true);
  const word = await created.json();
  const requestBody = {
    childProfileId: profileId,
    helpMode: "WITHOUT_IMAGE",
    exerciseType: "SINGLE_CONSONANT",
    requestedCount: 10,
    categoryId,
    difficulty: 5,
    includeLearned: false,
    requestKey: crypto.randomUUID()
  };
  const first = await page.request.post("/api/game/sessions", { data: requestBody });
  expect(first.status()).toBe(201);
  const payload = await first.json();
  expect(payload.exercises).toHaveLength(1);
  expect(payload.exercises[0]).toMatchObject({ targetKind: "CONSONANT", targetPosition: 0 });
  expect(payload.exercises[0].options).toHaveLength(3);
  expect(new Set(payload.exercises[0].options).size).toBe(3);
  expect(payload.exercises[0].options).toContain("M");
  const replay = await page.request.post("/api/game/sessions", { data: requestBody });
  expect((await replay.json()).exercises[0].options).toEqual(payload.exercises[0].options);
  const answerUrl = `/api/game/sessions/${payload.sessionId}/answers`;
  const common = {
    sessionExerciseId: payload.exercises[0].id,
    position: 0,
    audioPlayCount: 1,
    responseTimeMs: 500
  };
  const wrongLetter = payload.exercises[0].options.find((letter: string) => letter !== "M")!;
  const [wrongRequest, correctRequest] = await Promise.all([
    page.request.post(answerUrl, { data: { ...common, selectedLetter: wrongLetter } }),
    page.request.post(answerUrl, { data: { ...common, selectedLetter: "M" } })
  ]);
  expect(wrongRequest.ok()).toBe(true);
  expect(correctRequest.ok()).toBe(true);
  const [wrongResult, correctResult] = await Promise.all([
    wrongRequest.json(),
    correctRequest.json()
  ]);
  expect(correctResult.target).toMatchObject({
    selectedLetter: wrongResult.target.selectedLetter,
    outcome: wrongResult.target.outcome
  });
  expect(["CORRECT", "INCORRECT"]).toContain(wrongResult.target.outcome);
  const afterRefresh = await page.request.get(`/api/game/sessions/${payload.sessionId}`);
  expect((await afterRefresh.json()).exercises[0].targets[0]).toMatchObject({
    selectedLetter: wrongResult.target.selectedLetter,
    outcome: wrongResult.target.outcome
  });
  const legacyAttempt = await page.request.post(
    `/api/game/sessions/${payload.sessionId}/attempts`,
    {
      data: {
        configurationId: payload.exercises[0].configurationId,
        audioPlayCount: 1,
        responseTimeMs: 500,
        answers: [{ position: 0, selectedLetter: "M", correctFirstTry: true, errorCount: 0 }]
      }
    }
  );
  expect(legacyAttempt.status()).toBe(409);
  expect((await page.request.post(`/api/game/sessions/${payload.sessionId}/complete`)).ok()).toBe(true);
  expect((await page.request.delete(`/api/admin/words/${word.id}`)).ok()).toBe(true);
});

test("las APIs administrativas siguen exigiendo autenticación", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  expect((await request.delete(`/api/admin/words/${crypto.randomUUID()}`)).status()).toBe(401);
  expect(
    (
      await request.patch("/api/admin/settings/consonants", {
        data: { activeConsonants: ["M", "P", "L"] }
      })
    ).status()
  ).toBe(401);
});

test("cada espacio conserva la primera respuesta y el repaso separa ayuda y omisión", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  await page.goto("/");
  const profileHref = await page.locator(".profile-card").first().getAttribute("href");
  const profileId = new URL(profileHref!, "http://127.0.0.1:3000").searchParams.get("perfil")!;
  const categoryResponse = await page.request.post("/api/admin/categories", {
    data: { name: `E2E múltiples ${Date.now()}`, color: "#B9DCCB" }
  });
  expect(categoryResponse.ok()).toBe(true);
  const categoryId = (await categoryResponse.json()).id;
  const suffix = `MM${Date.now().toString().replace(/[0-9]/g, "M")}`;
  const created = await page.request.post("/api/admin/words", {
    multipart: {
      text: `MAMA${suffix}`,
      categoryId,
      difficulty: "4",
      vowelPositions: "[1,3]",
      consonantPositions: "[]",
      exerciseTypes: '["ALL_VOWELS"]'
    }
  });
  expect(created.ok()).toBe(true);
  const word = await created.json();
  const session = await page.request.post("/api/game/sessions", {
    data: {
      childProfileId: profileId,
      helpMode: "WITHOUT_IMAGE",
      exerciseType: "ALL_VOWELS",
      requestedCount: 10,
      categoryId,
      difficulty: 4,
      includeLearned: false,
      requestKey: crypto.randomUUID()
    }
  });
  expect(session.status()).toBe(201);
  const payload = await session.json();
  expect(payload.exercises).toHaveLength(1);
  expect(payload.exercises[0].targets).toHaveLength(2);
  const answerUrl = `/api/game/sessions/${payload.sessionId}/answers`;
  const exerciseId = payload.exercises[0].id;
  const firstWrong = await page.request.post(answerUrl, {
    data: { sessionExerciseId: exerciseId, position: 1, selectedLetter: "E", audioPlayCount: 0, responseTimeMs: 100 }
  });
  expect((await firstWrong.json()).target).toMatchObject({ selectedLetter: "E", outcome: "INCORRECT", expectedLetter: "A" });
  const discardedCorrect = await page.request.post(answerUrl, {
    data: { sessionExerciseId: exerciseId, position: 1, selectedLetter: "A", audioPlayCount: 0, responseTimeMs: 200 }
  });
  expect((await discardedCorrect.json()).target).toMatchObject({ selectedLetter: "E", outcome: "INCORRECT" });
  const secondCorrect = await page.request.post(answerUrl, {
    data: { sessionExerciseId: exerciseId, position: 3, selectedLetter: "A", audioPlayCount: 0, responseTimeMs: 100 }
  });
  expect((await secondCorrect.json()).target.outcome).toBe("CORRECT");
  const completed = await page.request.post(`/api/game/sessions/${payload.sessionId}/complete`);
  expect(await completed.json()).toMatchObject({ score: 50, correct: 1, total: 2, incorrect: 1 });

  const review = await page.request.post(`/api/game/sessions/${payload.sessionId}/review`, {
    data: { requestKey: crypto.randomUUID() }
  });
  expect(review.status()).toBe(201);
  const reviewPayload = await review.json();
  expect(reviewPayload.exercises).toHaveLength(1);
  expect(reviewPayload.exercises[0].targets.every((target: { outcome: string | null }) => target.outcome === null)).toBe(true);
  const reviewExerciseId = reviewPayload.exercises[0].id;
  const help = await page.request.post(`/api/game/sessions/${reviewPayload.sessionId}/help`, {
    data: { sessionExerciseId: reviewExerciseId, position: 1, reveal: false, audioPlayCount: 1, responseTimeMs: 50 }
  });
  expect((await help.json()).target).toMatchObject({ outcome: null, helpUsed: true });
  const assisted = await page.request.post(`/api/game/sessions/${reviewPayload.sessionId}/answers`, {
    data: { sessionExerciseId: reviewExerciseId, position: 1, selectedLetter: "A", audioPlayCount: 1, responseTimeMs: 100 }
  });
  expect((await assisted.json()).target.outcome).toBe("ASSISTED");
  const skipped = await page.request.post(`/api/game/sessions/${reviewPayload.sessionId}/skip`, {
    data: { sessionExerciseId: reviewExerciseId, position: 3, audioPlayCount: 0, responseTimeMs: 100 }
  });
  expect((await skipped.json()).target.outcome).toBe("SKIPPED");
  const reviewComplete = await page.request.post(`/api/game/sessions/${reviewPayload.sessionId}/complete`);
  expect(await reviewComplete.json()).toMatchObject({ score: 0, assisted: 1, skipped: 1 });

  expect((await page.request.delete(`/api/admin/words/${word.id}`)).ok()).toBe(true);
  const inactiveReview = await page.request.post(`/api/game/sessions/${payload.sessionId}/review`, {
    data: { requestKey: crypto.randomUUID() }
  });
  expect(inactiveReview.status()).toBe(409);
});
