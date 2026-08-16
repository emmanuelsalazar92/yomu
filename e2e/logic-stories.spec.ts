import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function chooseProfile(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator(".profile-card").first().click();
  await page.waitForURL(/\/jugar\?perfil=/);
  return new URL(page.url()).searchParams.get("perfil");
}

test("muestra las cinco rutas progresivas de lógica", async ({ page }) => {
  await chooseProfile(page);
  await page.getByRole("link", { name: /Lógica/ }).click();
  await expect(
    page.getByRole("heading", { name: "¡Miremos, pensemos y descubramos!" })
  ).toBeVisible();
  await expect(page.locator(".activity-level")).toHaveCount(5);
  await expect(page.locator(".level-activity-card")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Encuentra la forma/ })).toBeEnabled();
});

test("permite reconocer una forma", async ({ page }) => {
  const profile = await chooseProfile(page);
  await page.goto(
    `/jugar/actividad/sesion?profile=${profile}&type=LOGIC_SHAPE&mode=SHAPE&count=10&requestKey=${randomUUID()}&subject=logic`
  );
  await expect(page.getByRole("heading", { name: /Encuentra el/ })).toBeVisible();
  await expect(page.locator(".logic-shape-options button")).toHaveCount(3);
  await page.locator(".logic-shape-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
});

test("escucha un cuento y responde una pregunta", async ({ page }) => {
  const profile = await chooseProfile(page);
  await page.goto(
    `/jugar/actividad/sesion?profile=${profile}&type=STORY_COMPREHENSION&mode=LISTEN&count=10&requestKey=${randomUUID()}&subject=stories`
  );
  await expect(page.locator(".story-card")).toBeVisible();
  await expect(page.locator(".story-options button")).toHaveCount(3);
  await page.locator(".story-options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
});
