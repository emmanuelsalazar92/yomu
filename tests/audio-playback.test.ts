import { describe, expect, it, vi } from "vitest";
import {
  PlaybackUnavailableError,
  selectSpanishVoice,
  WordPlaybackController
} from "@/lib/audio-playback";

function voice(lang: string, name = lang) {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice;
}

function speechHarness(initialVoices: SpeechSynthesisVoice[] = [voice("es-CR")]) {
  let voices = initialVoices;
  let voicesChanged: (() => void) | undefined;
  const spoken: SpeechSynthesisUtterance[] = [];
  const synthesis = {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      spoken.push(utterance);
      utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
      utterance.onend?.(new Event("end") as SpeechSynthesisEvent);
    }),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "voiceschanged") voicesChanged = listener;
    }),
    removeEventListener: vi.fn()
  } as unknown as SpeechSynthesis;
  const createUtterance = (text: string) => ({ text }) as SpeechSynthesisUtterance;
  return {
    synthesis,
    spoken,
    createUtterance,
    updateVoices(next: SpeechSynthesisVoice[]) {
      voices = next;
      voicesChanged?.();
    }
  };
}

function audioFactory(result: "success" | "failure" | "pending") {
  const instances: Array<Record<string, unknown>> = [];
  const createAudio = vi.fn((src: string) => {
    const audio = {
      src,
      preload: "" as HTMLMediaElement["preload"],
      currentTime: 0,
      pause: vi.fn(),
      onplaying: null as (() => void) | null,
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      play: vi.fn(() => {
        if (result === "failure") return Promise.reject(new Error("falló"));
        audio.onplaying?.();
        if (result === "success") queueMicrotask(() => audio.onended?.());
        return Promise.resolve();
      })
    };
    instances.push(audio);
    return audio;
  });
  return { createAudio, instances };
}

describe("selección de voz española", () => {
  it("prefiere es-CR exacto", () => {
    expect(selectSpanishVoice([voice("es-ES"), voice("es-CR"), voice("es-MX")])?.lang).toBe(
      "es-CR"
    );
  });

  it("aplica la prioridad latinoamericana, es-US, es-ES y cualquier español", () => {
    expect(selectSpanishVoice([voice("es-ES"), voice("es-US"), voice("es-MX")])?.lang).toBe(
      "es-MX"
    );
    expect(selectSpanishVoice([voice("es-ES"), voice("es-US")])?.lang).toBe("es-US");
    expect(selectSpanishVoice([voice("fr-FR"), voice("es-ES")])?.lang).toBe("es-ES");
    expect(selectSpanishVoice([voice("fr-FR"), voice("es-XX")])?.lang).toBe("es-XX");
  });
});

describe("WordPlaybackController", () => {
  it("da prioridad al MP3 y no llama TTS", async () => {
    const speech = speechHarness();
    const audio = audioFactory("success");
    const controller = new WordPlaybackController({ ...speech, createAudio: audio.createAudio });
    await controller.speakWord({ text: "VACA", customAudioUrl: "/vaca.mp3" });
    expect(audio.createAudio).toHaveBeenCalledWith("/vaca.mp3");
    expect(speech.synthesis.speak).not.toHaveBeenCalled();
  });

  it.each(["VACA", "MANZANA", "ÁRBOL", "AVIÓN", "IGLÚ", "PINGÜINO", "NIÑO"])(
    "pronuncia la palabra completa %s mediante TTS",
    async (text) => {
      const speech = speechHarness();
      const controller = new WordPlaybackController(speech);
      await controller.speakWord({ text });
      expect(speech.spoken[0].text).toBe(text);
      expect(speech.spoken[0]).toMatchObject({ lang: "es-CR", rate: 0.8, pitch: 1, volume: 1 });
    }
  );

  it("intenta TTS cuando falla el MP3", async () => {
    const speech = speechHarness();
    const audio = audioFactory("failure");
    const controller = new WordPlaybackController({ ...speech, createAudio: audio.createAudio });
    await controller.speakWord({ text: "NIÑO", customAudioUrl: "/roto.mp3" });
    expect(speech.spoken[0].text).toBe("NIÑO");
  });

  it("devuelve un error controlado cuando fallan ambas fuentes", async () => {
    const audio = audioFactory("failure");
    const controller = new WordPlaybackController({ createAudio: audio.createAudio });
    await expect(
      controller.speakWord({ text: "VACA", customAudioUrl: "/roto.mp3" })
    ).rejects.toBeInstanceOf(PlaybackUnavailableError);
    expect(controller.getState()).toBe("error");
  });

  it("actualiza una lista inicialmente vacía con voiceschanged y limpia el listener", async () => {
    const speech = speechHarness([]);
    const controller = new WordPlaybackController(speech);
    speech.updateVoices([voice("es-MX")]);
    await controller.speakWord({ text: "ÁRBOL" });
    expect(speech.spoken[0].voice?.lang).toBe("es-MX");
    controller.dispose();
    expect(speech.synthesis.removeEventListener).toHaveBeenCalledWith(
      "voiceschanged",
      expect.any(Function)
    );
  });

  it("cancela antes de cada reproducción y los toques no forman una cola", async () => {
    const speech = speechHarness();
    const controller = new WordPlaybackController(speech);
    await Promise.all([
      controller.speakWord({ text: "VACA" }),
      controller.speakWord({ text: "MANZANA" })
    ]);
    expect(speech.synthesis.cancel).toHaveBeenCalled();
    expect(speech.spoken.at(-1)?.text).toBe("MANZANA");
  });

  it("detiene y reinicia un MP3 activo antes de un toque nuevo", async () => {
    const speech = speechHarness();
    const audio = audioFactory("pending");
    const controller = new WordPlaybackController({ ...speech, createAudio: audio.createAudio });
    const first = controller.speakWord({ text: "VACA", customAudioUrl: "/vaca.mp3" });
    const second = controller.speakWord({ text: "VACA", customAudioUrl: "/vaca.mp3" });
    controller.stopSpeaking();
    await Promise.all([first, second]);
    expect(audio.instances).toHaveLength(2);
    expect(
      audio.instances.every(
        (instance) => vi.mocked(instance.pause as () => void).mock.calls.length === 1
      )
    ).toBe(true);
  });
});
