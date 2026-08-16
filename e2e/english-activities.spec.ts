import { expect, test } from "@playwright/test";

async function openEnglishMenu(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await page.getByRole("link", { name: /English/ }).click();
}

test("muestra seis actividades de inglés sin repetir los perfiles", async ({ page }) => {
  await openEnglishMenu(page);
  await expect(page.getByRole("heading", { name: "Let’s learn English!" })).toBeVisible();
  await expect(page.locator(".level-activity-card")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Listen and choose/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Build a word/ })).toBeVisible();
  await expect(page.locator(".profile-grid")).toHaveCount(0);
  await expect(page.locator(".change-player-link")).toHaveText("Cambiar jugador");
});

test("inicia vocabulario visual y revela la palabra después de responder", async ({ page }) => {
  await openEnglishMenu(page);
  await page.getByRole("button", { name: /Listen and choose/ }).click();
  await expect(page.getByRole("heading", { name: "Listen and choose" })).toBeVisible();
  await expect(page.locator(".english-picture-options button")).toHaveCount(3);
  await page.locator(".english-picture-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
  await expect(page.locator(".english-picture-options button strong")).toHaveCount(3);
});

test("permite construir una palabra inglesa de tres letras", async ({ page }) => {
  await openEnglishMenu(page);
  await page.getByRole("button", { name: /Build a word/ }).click();
  await expect(page.getByRole("heading", { name: "Build a word" })).toBeVisible();
  await expect(page.locator(".letter-slots button")).toHaveCount(3);
  const choices = page.locator(".letter-options button");
  await expect(choices).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) await choices.nth(index).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".feedback")).toBeVisible();
});
