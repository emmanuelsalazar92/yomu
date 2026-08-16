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
}

test("carga varias palabras y permite administrar su imagen desde la tabla", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  const suffix = Date.now().toString();
  const firstWord = `CASA${suffix}`;
  const secondWord = `LUNA${suffix}`;

  await page.goto("/admin/palabras");
  const categoryOption = page.getByLabel("Categoría para todas").locator("option").nth(1);
  const categoryId = await categoryOption.getAttribute("value");
  expect(categoryId).toBeTruthy();
  await page.getByLabel("Palabras").fill(`${firstWord}\n${secondWord}`);
  await page.getByLabel("Categoría para todas").selectOption(categoryId!);
  await page.getByRole("button", { name: "Cargar 2 palabras" }).click();
  await expect(page.getByText("Resultado: 2 creadas")).toBeVisible();

  const row = page.locator("tbody tr", { hasText: firstWord });
  await expect(row.getByText("Sin imagen", { exact: true })).toBeVisible();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  await row.locator('input[type="file"]').setInputFiles({
    name: "palabra.png",
    mimeType: "image/png",
    buffer: png
  });
  await expect(row.getByText("Con imagen", { exact: true })).toBeVisible();
  await expect(row.getByRole("img", { name: `Imagen de ${firstWord}` })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Quitar" }).click();
  await expect(row.getByText("Sin imagen", { exact: true })).toBeVisible();

  const wordsResponse = await page.request.get("/api/admin/words");
  const words = await wordsResponse.json();
  for (const text of [firstWord, secondWord]) {
    const word = words.find((item: { text: string }) => item.text === text);
    expect(word).toBeTruthy();
    expect((await page.request.delete(`/api/admin/words/${word.id}`)).ok()).toBe(true);
  }
});

test("edita sílabas y la palabra completa sin perder la posición de la tabla", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  await page.goto("/admin/palabras");
  const categoryId = await page.getByLabel("Categoría para todas").locator("option").nth(1).getAttribute("value");
  expect(categoryId).toBeTruthy();
  const suffix = Array.from(crypto.randomUUID().slice(0, 6))
    .map((character) => String.fromCharCode(65 + (character.codePointAt(0)! % 20)))
    .join("");
  const text = `PALOMA${suffix}`;
  const createdResponse = await page.request.post("/api/admin/words", {
    multipart: {
      text,
      categoryId: categoryId!,
      difficulty: "1",
      syllables: "[]",
      vowelPositions: "[1]",
      consonantPositions: "[]",
      exerciseTypes: '["ONE_VOWEL"]'
    }
  });
  expect(createdResponse.status()).toBe(201);
  const created = await createdResponse.json() as { id: string };
  await page.reload();

  const row = page.locator("tbody tr", { hasText: text });
  await row.scrollIntoViewIfNeeded();
  const tableScroll = await page.evaluate(() => window.scrollY);
  await row.getByRole("button", { name: "Editar sílabas" }).click();
  const quickEditor = page.getByRole("dialog", { name: `Sílabas de ${text}` });
  await expect(quickEditor).toBeVisible();
  const boundaries = quickEditor.locator(".syllable-letter-pair > button");
  await boundaries.nth(2).click();
  await boundaries.nth(5).click();
  const expected = `${text.slice(0, 3)}-${text.slice(3, 6)}-${text.slice(6)}`;
  await expect(quickEditor.getByLabel("Separación")).toHaveValue(expected);
  await quickEditor.getByRole("button", { name: "Guardar sílabas" }).click();
  await expect(quickEditor).toBeHidden();
  await expect(row.getByText(`${expected} · 3`, { exact: true })).toBeVisible();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - tableScroll)).toBeLessThan(5);

  await row.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: `Editar ${text}` })).toBeVisible();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - tableScroll)).toBeLessThan(5);
  await page.getByRole("button", { name: "Cerrar edición" }).click();
  await expect(page.getByRole("dialog", { name: `Editar ${text}` })).toBeHidden();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - tableScroll)).toBeLessThan(5);

  expect((await page.request.delete(`/api/admin/words/${created.id}`)).ok()).toBe(true);
});
