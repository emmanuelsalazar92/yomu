import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function openMathMenu(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await page.getByRole("link", { name: /Matemáticas/ }).click();
}

async function openMathActivity(
  page: import("@playwright/test").Page,
  type: string,
  mode: string,
  count: number
) {
  await openMathMenu(page);
  const profile = new URL(page.url()).searchParams.get("perfil");
  await page.goto(
    `/jugar/actividad/sesion?profile=${profile}&type=${type}&mode=${mode}&count=${count}&requestKey=${randomUUID()}&subject=math`
  );
}

test("muestra doce actividades matemáticas en seis niveles", async ({ page }) => {
  await openMathMenu(page);
  await expect(page.getByRole("heading", { name: "¡Juguemos con números!" })).toBeVisible();
  await expect(page.locator(".activity-level")).toHaveCount(6);
  await expect(page.locator(".level-activity-card")).toHaveCount(12);
  await expect(page.getByRole("button", { name: /Cuenta los objetos/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mis primeras sumas/ })).toBeVisible();
  await expect(page.locator(".profile-grid")).toHaveCount(0);
});

test("representa un número de dos dígitos con decenas y unidades", async ({ page }) => {
  await openMathActivity(page, "MATH_PLACE_VALUE", "PLACE_VALUE", 20);
  await expect(page.getByRole("heading", { name: "Decenas y unidades" })).toBeVisible();
  await expect(page.locator(".place-value-blocks")).toBeVisible();
  await expect(page.locator(".tens-rods i").first()).toBeVisible();
  await expect(page.locator(".math-number-options button")).toHaveCount(3);
});

test("resuelve una suma de dos dígitos sin llevadas", async ({ page }) => {
  await openMathActivity(page, "MATH_ADDITION_TWO_DIGIT", "CALCULATE", 30);
  await expect(page.getByRole("heading", { name: "Suma dos dígitos" })).toBeVisible();
  await expect(page.locator(".two-digit-operation-visual .two-digit-number")).toHaveCount(2);
  await page.locator(".math-number-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("presenta una suma como problema cotidiano", async ({ page }) => {
  await openMathActivity(page, "MATH_STORY_ADDITION", "PROBLEM", 20);
  await expect(page.getByRole("heading", { name: "Un problema de cada día" })).toBeVisible();
  await expect(page.locator(".math-story-card")).toBeVisible();
  await expect(page.locator(".math-number-options button")).toHaveCount(3);
});

test("permite contar objetos y responder con un número", async ({ page }) => {
  await openMathMenu(page);
  await page.getByRole("button", { name: /Cuenta los objetos/ }).click();
  await expect(page.getByRole("heading", { name: "Cuenta los objetos" })).toBeVisible();
  expect(await page.locator(".math-object-group i").count()).toBeGreaterThan(0);
  await expect(page.locator(".math-number-options button")).toHaveCount(3);
  await page.locator(".math-number-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("muestra una suma visual y guarda la respuesta", async ({ page }) => {
  await openMathMenu(page);
  await page.getByRole("button", { name: /Mis primeras sumas/ }).click();
  await expect(page.getByRole("heading", { name: "Junta y suma" })).toBeVisible();
  await expect(page.locator(".math-operation-visual")).toBeVisible();
  await expect(page.locator(".math-equation-prompt")).toContainText("=");
  await page.locator(".math-number-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
});
