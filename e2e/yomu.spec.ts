import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(process.env.ADMIN_EMAIL || "admin@yomu.local");
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD || "cambia-esta-contrasena");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/);
}

test("la administración de palabras es responsive y contiene los controles", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/palabras");
  await expect(page.getByRole("heading", { name: "Nueva palabra" })).toBeVisible();
  await expect(page.getByText("Seleccionar imagen", { exact: true }).first()).toBeVisible();
  const geometry = await page.evaluate(() => {
    const form = document.querySelector(".word-form")!.getBoundingClientRect();
    const controls = [
      ...document.querySelectorAll(
        ".word-form .input, .word-form .select, .upload-control, .word-submit"
      )
    ];
    return {
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      outside: controls.filter((control) => {
        const box = control.getBoundingClientRect();
        return box.left < form.left - 1 || box.right > form.right + 1;
      }).length
    };
  });
  expect(geometry).toEqual({ pageOverflow: false, outside: 0 });
});

test("el borrado exige confirmación y desaparece de la biblioteca", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  await page.goto("/admin/palabras");
  const suffix = Date.now()
    .toString()
    .slice(-7)
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
  const word = `BORRABLE${suffix}`;
  await page.getByLabel("1. Escribe la palabra").fill(word);
  await page.locator(".letter-choice.vowel").first().click();
  await page.getByLabel("Categoría").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Guardar palabra" }).click();
  const row = page.locator("tr", { hasText: word });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Eliminar" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("intentos y puntajes históricos se conservarán");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(row).toBeVisible();
  await page.route("**/api/admin/words/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"error":"Fallo simulado"}'
      });
    } else await route.continue();
  });
  await row.getByRole("button", { name: "Eliminar" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText("Fallo simulado");
  await expect(row).toBeVisible();
  await page.unroute("**/api/admin/words/*");
  let deleteRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "DELETE" && request.url().includes("/api/admin/words/")) {
      deleteRequests += 1;
    }
  });
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(row).toHaveCount(0);
  expect(deleteRequests).toBe(1);
  await expect(page.getByRole("status")).toContainText("se eliminó de la biblioteca");
});

test("el borrado de palabras requiere autenticación administrativa", async ({
  request
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  const response = await request.delete(`/api/admin/words/${crypto.randomUUID()}`);
  expect(response.status()).toBe(401);
});

test("la configuración muestra disponibilidad antes de habilitar el inicio", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await page.getByRole("button", { name: /Sin imagen/ }).click();
  await expect(page.locator(".availability-card")).toContainText("palabras únicas disponibles");
  await expect(page.getByRole("button", { name: /¡A jugar!/ })).toBeEnabled();
});

test("el resultado usa el total real de la sesión", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await page.goto("/");
  await page.evaluate(() => {
    sessionStorage.setItem(
      "yomu-result",
      JSON.stringify({ correct: 3, total: 3, words: 3, sessionTotal: 3 })
    );
  });
  await page.goto("/jugar/resultado");
  await expect(page.getByText("3/3 ejercicios completados")).toBeVisible();
  await expect(page.getByText("3/10")).toHaveCount(0);
});

test("disponibilidad, sesión e idempotencia usan palabras únicas y respetan borrados", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  const unique = Date.now().toString();
  await page.goto("/");
  const profileHref = await page.locator(".profile-card").first().getAttribute("href");
  const profileId = new URL(profileHref!, "http://127.0.0.1:3000").searchParams.get("perfil")!;
  await page.goto("/admin/palabras");
  const categoryId = (await page
    .getByLabel("Categoría")
    .locator("option")
    .nth(1)
    .getAttribute("value"))!;
  const wordResponse = await page.request.post("/api/admin/words", {
    multipart: {
      text: `OSO${unique.replaceAll("0", "B").replaceAll("1", "C").replaceAll("2", "D").replaceAll("3", "F").replaceAll("4", "G").replaceAll("5", "H").replaceAll("6", "J").replaceAll("7", "K").replaceAll("8", "L").replaceAll("9", "M")}`,
      categoryId,
      difficulty: "5",
      hiddenPositions: "[0,2]",
      exerciseTypes: '["ALL_VOWELS"]'
    }
  });
  expect(wordResponse.ok()).toBe(true);
  const word = (await wordResponse.json()) as { id: string };
  const options = {
    childProfileId: profileId,
    exerciseType: "ALL_VOWELS",
    requestedCount: 10,
    categoryId,
    difficulty: 5,
    includeLearned: false
  };
  const withImage = await page.request.post("/api/game/availability", {
    data: { ...options, helpMode: "WITH_IMAGE" }
  });
  expect((await withImage.json()).actualCount).toBe(0);
  const withAudio = await page.request.post("/api/game/availability", {
    data: { ...options, helpMode: "LISTEN" }
  });
  expect((await withAudio.json()).actualCount).toBe(0);
  const zeroSession = await page.request.post("/api/game/sessions", {
    data: { ...options, helpMode: "WITH_IMAGE", requestKey: crypto.randomUUID() }
  });
  expect(zeroSession.status()).toBe(409);
  const withoutImage = await page.request.post("/api/game/availability", {
    data: { ...options, helpMode: "WITHOUT_IMAGE" }
  });
  expect(await withoutImage.json()).toMatchObject({ availableCount: 1, actualCount: 1 });
  const paused = await page.request.patch(`/api/admin/words/${word.id}`, {
    data: { active: false }
  });
  expect((await paused.json()).active).toBe(false);
  const whileInactive = await page.request.post("/api/game/availability", {
    data: { ...options, helpMode: "WITHOUT_IMAGE" }
  });
  expect((await whileInactive.json()).actualCount).toBe(0);
  const reactivated = await page.request.patch(`/api/admin/words/${word.id}`, {
    data: { active: true }
  });
  expect((await reactivated.json()).active).toBe(true);
  const body = { ...options, helpMode: "WITHOUT_IMAGE", requestKey: crypto.randomUUID() };
  const first = await page.request.post("/api/game/sessions", { data: body });
  expect(first.status()).toBe(201);
  const firstPayload = await first.json();
  expect(firstPayload.exercises).toHaveLength(1);
  expect(new Set(firstPayload.exercises.map((item: { wordId: string }) => item.wordId)).size).toBe(
    1
  );
  const replay = await page.request.post("/api/game/sessions", { data: body });
  expect((await replay.json()).sessionId).toBe(firstPayload.sessionId);
  const attempt = await page.request.post(`/api/game/sessions/${firstPayload.sessionId}/attempts`, {
    data: {
      configurationId: firstPayload.exercises[0].configurationId,
      audioPlayCount: 0,
      responseTimeMs: 1000,
      answers: [
        { position: 0, selectedVowel: "O", correctFirstTry: true, errorCount: 0 },
        { position: 2, selectedVowel: "O", correctFirstTry: true, errorCount: 0 }
      ]
    }
  });
  expect(attempt.ok()).toBe(true);
  expect((await page.request.delete(`/api/admin/words/${word.id}`)).ok()).toBe(true);
  const afterDelete = await page.request.post("/api/game/availability", {
    data: { ...options, helpMode: "WITHOUT_IMAGE" }
  });
  expect((await afterDelete.json()).actualCount).toBe(0);
  const stableReplay = await page.request.post("/api/game/sessions", { data: body });
  expect((await stableReplay.json()).exercises).toHaveLength(1);
});
