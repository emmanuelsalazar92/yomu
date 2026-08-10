import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(process.env.ADMIN_EMAIL || "admin@yomu.local");
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD || "cambia-esta-contrasena");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/admin$/);
}

function uniqueLetters() {
  return Date.now()
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
}

const mp3 = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0, 0, 0, 0, 0]);

test("subir audio requiere autenticación administrativa", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  const response = await request.post("/api/admin/words", {
    multipart: {
      text: "VACA",
      categoryId: crypto.randomUUID(),
      difficulty: "1",
      hiddenPositions: "[1]",
      exerciseTypes: '["ONE_VOWEL"]',
      audio: { name: "vaca.mp3", mimeType: "audio/mpeg", buffer: mp3 }
    }
  });
  expect(response.status()).toBe(401);
});

test("el formulario valida y muestra las opciones de voz y MP3", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/palabras");
  await expect(page.getByRole("button", { name: "Probar voz automática" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Escuchar / }).first()).toBeVisible();
  await expect(page.getByText("Voz automática", { exact: true }).first()).toBeVisible();
  await page.getByLabel("1. Escribe la palabra").fill("PINGÜINO");
  await page.locator('input[name="audio"]').setInputFiles({
    name: "incorrecto.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("audio")
  });
  await expect(page.locator(".word-form .error-text")).toContainText("debe ser un archivo MP3");
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    buttons: [...document.querySelectorAll("button")].every((button) => {
      const box = button.getBoundingClientRect();
      return box.right <= document.documentElement.clientWidth + 1;
    })
  }));
  expect(geometry).toEqual({ overflow: false, buttons: true });
});

test("ciclo de vida del MP3: crear, conservar, reemplazar, retirar y limpiar", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await adminLogin(page);
  await page.goto("/admin/palabras");
  const categoryId = (await page
    .getByLabel("Categoría")
    .locator("option")
    .nth(1)
    .getAttribute("value"))!;
  const suffix = uniqueLetters();
  const fields = {
    text: `AUDIO${suffix}`,
    categoryId,
    difficulty: "1",
    hiddenPositions: "[0]",
    exerciseTypes: '["ONE_VOWEL"]'
  };

  const invalid = await page.request.post("/api/admin/words", {
    multipart: {
      ...fields,
      text: `INVALIDA${suffix}`,
      audio: { name: "audio.txt", mimeType: "text/plain", buffer: Buffer.from("no es mp3") }
    }
  });
  expect(invalid.status()).toBe(400);
  const oversized = await page.request.post("/api/admin/words", {
    multipart: {
      ...fields,
      text: `GRANDE${suffix}`,
      audio: {
        name: "grande.mp3",
        mimeType: "audio/mpeg",
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1)
      }
    }
  });
  expect(oversized.status()).toBe(400);

  const withoutAudio = await page.request.post("/api/admin/words", { multipart: fields });
  expect(withoutAudio.status()).toBe(201);
  const withoutAudioWord = (await withoutAudio.json()) as { id: string; audioPath: null };
  expect(withoutAudioWord.audioPath).toBeNull();

  const create = await page.request.post("/api/admin/words", {
    multipart: {
      ...fields,
      text: `AMPA${suffix}`,
      audio: { name: "primero.mp3", mimeType: "audio/mpeg", buffer: mp3 }
    }
  });
  const created = (await create.json()) as { id: string; audioPath: string; error?: string };
  expect(create.status(), created.error).toBe(201);
  const firstUrl = `/api/media/${created.audioPath}`;
  expect((await page.request.get(firstUrl)).status()).toBe(200);

  const preserve = await page.request.patch(`/api/admin/words/${created.id}`, {
    multipart: { ...fields, text: `AMPA${suffix}`, difficulty: "2", removeAudio: "false" }
  });
  expect((await preserve.json()).audioPath).toBe(created.audioPath);

  const replace = await page.request.patch(`/api/admin/words/${created.id}`, {
    multipart: {
      ...fields,
      text: `AMPA${suffix}`,
      removeAudio: "false",
      audio: { name: "segundo.mp3", mimeType: "audio/mpeg", buffer: mp3 }
    }
  });
  const replaced = (await replace.json()) as { audioPath: string };
  expect(replaced.audioPath).not.toBe(created.audioPath);
  expect((await page.request.get(firstUrl)).status()).toBe(404);

  const remove = await page.request.patch(`/api/admin/words/${created.id}`, {
    multipart: { ...fields, text: `AMPA${suffix}`, removeAudio: "true" }
  });
  expect((await remove.json()).audioPath).toBeNull();
  expect((await page.request.get(`/api/media/${replaced.audioPath}`)).status()).toBe(404);

  const deletable = await page.request.post("/api/admin/words", {
    multipart: {
      ...fields,
      text: `ABORRAUDIO${suffix}`,
      audio: { name: "borrar.mp3", mimeType: "audio/mpeg", buffer: mp3 }
    }
  });
  const deletableWord = (await deletable.json()) as { id: string; audioPath: string };
  expect((await page.request.delete(`/api/admin/words/${deletableWord.id}`)).ok()).toBe(true);
  expect((await page.request.get(`/api/media/${deletableWord.audioPath}`)).status()).toBe(404);

  await page.request.delete(`/api/admin/words/${created.id}`);
  await page.request.delete(`/api/admin/words/${withoutAudioWord.id}`);
});
