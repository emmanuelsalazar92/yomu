import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __yomuAudioMock: {
      tts: string[];
      mp3: string[];
      cancels: number;
      pauses: number;
      disableTts: boolean;
    };
  }
}

async function installAudioMocks(page: Page) {
  await page.addInitScript(() => {
    window.__yomuAudioMock = {
      tts: [],
      mp3: [],
      cancels: 0,
      pauses: 0,
      disableTts: false
    };
    class FakeUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onstart: ((event: Event) => void) | null = null;
      onend: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const synthesis = {
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      cancel: () => {
        window.__yomuAudioMock.cancels += 1;
      },
      speak: (utterance: FakeUtterance) => {
        if (window.__yomuAudioMock.disableTts) {
          utterance.onerror?.(new Event("error"));
          return;
        }
        window.__yomuAudioMock.tts.push(utterance.text);
        utterance.onstart?.(new Event("start"));
        queueMicrotask(() => utterance.onend?.(new Event("end")));
      }
    };
    class FakeAudio {
      src: string;
      preload = "";
      currentTime = 0;
      onplaying: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(src: string) {
        this.src = src;
      }
      pause() {
        window.__yomuAudioMock.pauses += 1;
      }
      play() {
        window.__yomuAudioMock.mp3.push(this.src);
        if (this.src.includes("fallo")) return Promise.reject(new Error("MP3 simulado falló"));
        this.onplaying?.();
        queueMicrotask(() => this.onended?.());
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeUtterance
    });
    Object.defineProperty(window, "Audio", { configurable: true, value: FakeAudio });
  });
}

async function openSession(page: Page, audioUrl: string | null, text = "VACA") {
  const token = crypto.randomUUID();
  await page.route("**/api/game/sessions", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        requestedCount: 10,
        actualCount: 1,
        exercises: [
          {
            id: crypto.randomUUID(),
            wordId: crypto.randomUUID(),
            configurationId: crypto.randomUUID(),
            text,
            hiddenPositions: [text === "ÁRBOL" ? 0 : 1],
            type: "ONE_VOWEL",
            imageUrl: null,
            audioUrl
          }
        ]
      })
    });
  });
  await page.route("**/api/game/sessions/*/attempts", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: "{}" })
  );
  await page.goto(
    `/jugar/sesion?profile=${crypto.randomUUID()}&mode=LISTEN&type=ONE_VOWEL&count=10&requestKey=${token}`
  );
  await expect(page.getByRole("button", { name: "Escuchar palabra" })).toBeVisible();
}

test("el botón Escuchar conserva área táctil y no desborda los viewports", async ({ page }) => {
  await installAudioMocks(page);
  await openSession(page, null);
  const geometry = await page
    .getByRole("button", { name: "Escuchar palabra" })
    .evaluate((button) => {
      const box = button.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        inside: box.left >= 0 && box.right <= document.documentElement.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });
  expect(geometry.width).toBeGreaterThanOrEqual(64);
  expect(geometry.height).toBeGreaterThanOrEqual(64);
  expect(geometry.inside).toBe(true);
  expect(geometry.pageOverflow).toBe(false);
});

test("el juego decide MP3/TTS, repite sin cola y revela la palabra completa", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await installAudioMocks(page);

  await openSession(page, null);
  const listen = page.getByRole("button", { name: "Escuchar palabra" });
  await listen.click();
  await listen.click();
  await expect
    .poll(() => page.evaluate(() => window.__yomuAudioMock.tts))
    .toEqual(["VACA", "VACA"]);
  expect(await page.evaluate(() => window.__yomuAudioMock.mp3)).toEqual([]);

  await page.unroute("**/api/game/sessions");
  await openSession(page, "/api/media/audios/personalizado.mp3");
  await page.getByRole("button", { name: "Escuchar palabra" }).click();
  await expect.poll(() => page.evaluate(() => window.__yomuAudioMock.mp3.length)).toBe(1);
  expect(await page.evaluate(() => window.__yomuAudioMock.tts.at(-1))).toBeUndefined();

  await page.unroute("**/api/game/sessions");
  await openSession(page, "/api/media/audios/fallo.mp3", "ÁRBOL");
  await page.getByRole("button", { name: "Escuchar palabra" }).click();
  await expect.poll(() => page.evaluate(() => window.__yomuAudioMock.tts.at(-1))).toBe("ÁRBOL");
  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.getByText("ÁRBOL", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__yomuAudioMock.cancels)).toBeGreaterThan(2);
});

test("el fallo total de audio muestra un aviso y no bloquea el ejercicio", async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440x900");
  await installAudioMocks(page);
  await openSession(page, "/api/media/audios/fallo.mp3");
  await page.evaluate(() => {
    window.__yomuAudioMock.disableTts = true;
  });
  await page.getByRole("button", { name: "Escuchar palabra" }).click();
  await expect(page.getByText(/puedes continuar jugando/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "A", exact: true })).toBeEnabled();
});
