import { expect, test } from "@playwright/test";

async function chooseDemoProfile(page: import("@playwright/test").Page) {
  await page.goto("/jugar");
  const profile = page.getByRole("button", { name: /Explorador/ });
  if (await profile.isVisible()) await profile.click();
}

test("muestra las tres actividades independientes para el perfil configurado", async ({ page }) => {
  await chooseDemoProfile(page);
  await expect(page.getByRole("button", { name: /Mayúscula y minúscula/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Construye tu nombre/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cuántas sílabas/ })).toBeVisible();
});

test("resuelve una pareja de mayúscula y minúscula con una sola respuesta", async ({ page }) => {
  await chooseDemoProfile(page);
  await page.getByRole("button", { name: /Mayúscula y minúscula/ }).click();
  await expect(page.getByRole("heading", { name: "Mayúscula y minúscula" })).toBeVisible();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByText("¿Cuál es su pareja?")).toBeVisible();
  const options = page.locator(".case-options button");
  await options.first().click();
  await expect(page.locator(".feedback")).toBeVisible();
  await expect(options.first()).toBeDisabled();
});

test("construye el nombre y solo evalúa al comprobar", async ({ page }) => {
  await chooseDemoProfile(page);
  await page.getByRole("button", { name: /Construye tu nombre/ }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.locator(".name-tiles")).toBeVisible();
  await expect(page.getByText("LUNA", { exact: true })).toBeVisible();
  const tiles = page.locator(".name-tiles button");
  const count = await tiles.count();
  for (let index = 0; index < count; index += 1) await tiles.nth(index).click();
  await expect(page.locator(".feedback")).toHaveCount(0);
  await page.getByRole("button", { name: "Comprobar" }).click();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("oculta la palabra de sílabas hasta después de responder", async ({ page }) => {
  await chooseDemoProfile(page);
  await page.getByRole("button", { name: /Cuántas sílabas/ }).click();
  await page.getByRole("button", { name: /Empezar/ }).click();
  await expect(page.getByRole("heading", { name: "Escucha y cuenta" })).toBeVisible();
  await expect(page.locator(".syllable-reveal")).toHaveCount(0);
  await page.locator(".syllable-options button").first().click();
  await expect(page.locator(".syllable-reveal")).toBeVisible();
});

test("integra configuración administrativa, sesiones, primera respuesta y repaso", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  const login = await page.request.post("/api/admin/login", { data: { email: "admin@yomu.local", password: "cambia-esta-contrasena" } });
  expect(login.ok()).toBe(true);
  const suffix = Array.from(crypto.randomUUID().slice(0, 6)).map((character) => String.fromCharCode(65 + (character.codePointAt(0)! % 20))).join("");
  const profileResponse = await page.request.post("/api/admin/profiles", { data: { nickname: `E2E Actividad ${suffix}`, avatar: "🧩", practiceName: "MAÑANA", nameActivityEnabled: true } });
  expect(profileResponse.status()).toBe(201);
  const profile = await profileResponse.json() as { id: string; practiceName: string };
  expect(profile.practiceName).toBe("MAÑANA");
  const wordsResponse = await page.request.get("/api/admin/words");
  const words = await wordsResponse.json() as Array<{ category: { id: string } }>;
  const text = `PINGÜINO${suffix}`;
  const wordResponse = await page.request.post("/api/admin/words", { multipart: {
    text, categoryId: words[0].category.id, difficulty: "1", syllables: JSON.stringify(["PIN", "GÜI", `NO${suffix}`]),
    vowelPositions: "[1]", consonantPositions: "[]", exerciseTypes: '["ONE_VOWEL"]'
  } });
  expect(wordResponse.status()).toBe(201);
  const word = await wordResponse.json() as { id: string; syllables: string[] };
  expect(word.syllables).toEqual(["PIN", "GÜI", `NO${suffix}`]);
  const invalid = await page.request.patch(`/api/admin/words/${word.id}`, { multipart: {
    text, categoryId: words[0].category.id, difficulty: "1", syllables: '["SEGMENTACIÓN","INCORRECTA"]',
    vowelPositions: "[1]", consonantPositions: "[]", exerciseTypes: '["ONE_VOWEL"]'
  } });
  expect(invalid.status()).toBe(400);

  const caseResponse = await page.request.post("/api/activities/sessions", { data: {
    childProfileId: profile.id, activityType: "CASE_MATCH", mode: "MIXED", requestedCount: 5, requestKey: crypto.randomUUID()
  } });
  expect(caseResponse.status()).toBe(201);
  const caseSession = await caseResponse.json() as { id: string; items: Array<{ id: string; firstResponse: string | null; outcome: string | null }> };
  const firstAnswer = await page.request.post(`/api/activities/sessions/${caseSession.id}/answer`, { data: { itemId: caseSession.items[0].id, action: "ANSWER", response: "?", responseTimeMs: 50 } });
  expect(firstAnswer.ok()).toBe(true);
  const secondAnswer = await page.request.post(`/api/activities/sessions/${caseSession.id}/answer`, { data: { itemId: caseSession.items[0].id, action: "ANSWER", response: "A", responseTimeMs: 70 } });
  const immutable = await secondAnswer.json() as { items: Array<{ firstResponse: string; outcome: string }> };
  expect(immutable.items[0]).toMatchObject({ firstResponse: "?", outcome: "INCORRECT" });
  const review = await page.request.post(`/api/activities/sessions/${caseSession.id}/review`, { data: { requestKey: crypto.randomUUID() } });
  expect(review.status()).toBe(201);

  const nameSession = await page.request.post("/api/activities/sessions", { data: {
    childProfileId: profile.id, activityType: "NAME_TILES", mode: "WITH_MODEL", requestedCount: 5, requestKey: crypto.randomUUID()
  } });
  expect(nameSession.status()).toBe(201);
  expect((await nameSession.json()).actualCount).toBe(1);
  const syllableSession = await page.request.post("/api/activities/sessions", { data: {
    childProfileId: profile.id, activityType: "SYLLABLE_COUNT", mode: "COUNT", requestedCount: 5,
    categoryId: words[0].category.id, difficulty: 1, requestKey: crypto.randomUUID()
  } });
  expect(syllableSession.status()).toBe(201);
  const syllablePayload = await syllableSession.json() as { actualCount: number; items: Array<{ reveal: null }> };
  expect(syllablePayload.actualCount).toBeGreaterThan(0);
  expect(syllablePayload.items.every((item) => item.reveal === null)).toBe(true);
  expect((await page.request.delete(`/api/admin/words/${word.id}`)).ok()).toBe(true);
});
