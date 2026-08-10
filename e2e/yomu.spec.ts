import { expect, test, type Page } from "@playwright/test";
import { createSessionToken } from "../lib/security";

async function adminLogin(page: Page) {
  if (!process.env.E2E_ADMIN_ID) throw new Error("E2E_ADMIN_ID es obligatorio");
  await page
    .context()
    .addCookies([
      {
        name: "yomu_admin",
        value: createSessionToken(process.env.E2E_ADMIN_ID),
        url: "http://127.0.0.1:3000"
      }
    ]);
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
  await expect(page.getByRole("button", { name: /Vocales/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Consonantes/ })).toBeVisible();
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
  await expect(page.getByText(/consonantes al primer intento/)).toBeVisible();
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
  await page.goto("/admin/palabras");
  const categoryId = (await page
    .getByLabel("Categoría")
    .locator("option")
    .nth(1)
    .getAttribute("value"))!;
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
  const attempt = await page.request.post(`/api/game/sessions/${payload.sessionId}/attempts`, {
    data: {
      configurationId: payload.exercises[0].configurationId,
      audioPlayCount: 1,
      responseTimeMs: 500,
      answers: [{ position: 0, selectedLetter: "M", correctFirstTry: true, errorCount: 0 }]
    }
  });
  expect(attempt.ok()).toBe(true);
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
