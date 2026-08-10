import { expect, test, type Page } from "@playwright/test";

async function drawLetter(page: Page, letter: string) {
  const canvas = page.getByLabel(`Traza la letra ${letter}`);
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 80, box!.y + 210);
  await page.mouse.down();
  for (let step = 0; step < 18; step += 1) {
    await page.mouse.move(box!.x + 80 + step * 8, box!.y + 210 - step * 7);
  }
  await page.mouse.up();
}

test("el modo de trazado se descubre y no desborda ningún viewport", async ({ page }) => {
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await expect(page.getByRole("heading", { name: "Trazar una letra varias veces" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir trazado" }).click();
  await expect(page).toHaveURL(/\/jugar\/trazo/);
  await expect(page.getByRole("heading", { name: "Trazar letras" })).toBeVisible();
  await expect(page.getByText("No hay reloj.")).toBeVisible();
  const letterBox = await page.getByRole("button", { name: "M", exact: true }).boundingBox();
  expect(letterBox!.height).toBeGreaterThanOrEqual(60);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("traza una letra N veces sin cronómetro y permite repetir", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await page.goto("/jugar/trazo");
  await page.getByRole("button", { name: "A", exact: true }).click();
  await page.getByLabel("Cantidad personalizada").fill("2");
  await page.getByRole("button", { name: "Trazar A · 2 veces" }).click();

  await expect(page.getByText("Trazo 1 de 2")).toBeVisible();
  await drawLetter(page, "A");
  await page.getByRole("button", { name: "¡Listo!" }).click();
  await expect(page.getByText("Trazo 2 de 2")).toBeVisible();
  await drawLetter(page, "A");
  await page.getByRole("button", { name: "¡Listo!" }).click();

  await expect(page.getByRole("heading", { name: "¡Trazaste la A 2 veces!" })).toBeVisible();
  await page.getByRole("button", { name: "Repetir la serie" }).click();
  await expect(page.getByText("Trazo 1 de 2")).toBeVisible();
});
