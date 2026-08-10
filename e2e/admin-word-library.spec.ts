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
