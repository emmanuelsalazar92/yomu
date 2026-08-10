export type SpeakWordInput = {
  text: string;
  customAudioUrl?: string | null;
};

export type PlaybackState = "idle" | "loading" | "playing" | "error";

type BrowserAudio = Pick<
  HTMLAudioElement,
  "src" | "preload" | "currentTime" | "play" | "pause" | "onplaying" | "onended" | "onerror"
>;

type SpeechEnvironment = {
  synthesis?: SpeechSynthesis;
  createUtterance?: (text: string) => SpeechSynthesisUtterance;
  createAudio?: (url: string) => BrowserAudio;
};

const LATIN_AMERICAN_SPANISH = new Set([
  "es-419",
  "es-ar",
  "es-bo",
  "es-cl",
  "es-co",
  "es-cu",
  "es-do",
  "es-ec",
  "es-gt",
  "es-hn",
  "es-mx",
  "es-ni",
  "es-pa",
  "es-pe",
  "es-pr",
  "es-py",
  "es-sv",
  "es-uy",
  "es-ve"
]);

export function selectSpanishVoice(voices: readonly SpeechSynthesisVoice[]) {
  const rank = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase().replaceAll("_", "-");
    if (lang === "es-cr") return 0;
    if (LATIN_AMERICAN_SPANISH.has(lang)) return 1;
    if (lang === "es-us") return 2;
    if (lang === "es-es") return 3;
    if (lang.startsWith("es")) return 4;
    return 5;
  };
  return [...voices].filter((voice) => rank(voice) < 5).sort((a, b) => rank(a) - rank(b))[0];
}

export class PlaybackUnavailableError extends Error {
  constructor() {
    super("No fue posible reproducir la palabra");
    this.name = "PlaybackUnavailableError";
  }
}

export class WordPlaybackController {
  private readonly synthesis?: SpeechSynthesis;
  private readonly createUtterance?: (text: string) => SpeechSynthesisUtterance;
  private readonly createAudio?: (url: string) => BrowserAudio;
  private audio: BrowserAudio | null = null;
  private preparedAudio: BrowserAudio | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private state: PlaybackState = "idle";
  private generation = 0;
  private finishPending: (() => void) | null = null;
  private subscribers = new Set<(state: PlaybackState) => void>();

  constructor(environment: SpeechEnvironment = {}) {
    this.synthesis =
      environment.synthesis ?? (typeof window !== "undefined" ? window.speechSynthesis : undefined);
    this.createUtterance =
      environment.createUtterance ??
      (typeof SpeechSynthesisUtterance !== "undefined"
        ? (text) => new SpeechSynthesisUtterance(text)
        : undefined);
    this.createAudio =
      environment.createAudio ??
      (typeof Audio !== "undefined" ? (url) => new Audio(url) : undefined);
    this.refreshVoices();
    this.synthesis?.addEventListener?.("voiceschanged", this.refreshVoices);
  }

  private refreshVoices = () => {
    this.voices = this.synthesis?.getVoices?.() ?? [];
  };

  private setState(state: PlaybackState) {
    this.state = state;
    this.subscribers.forEach((subscriber) => subscriber(state));
  }

  getState() {
    return this.state;
  }

  subscribe(subscriber: (state: PlaybackState) => void) {
    this.subscribers.add(subscriber);
    subscriber(this.state);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  isSpeechAvailable() {
    return Boolean(this.synthesis && this.createUtterance);
  }

  prepareCustomAudio(url?: string | null) {
    if (this.preparedAudio?.src === url) return;
    if (this.preparedAudio) {
      this.preparedAudio.pause();
      this.preparedAudio.src = "";
      this.preparedAudio = null;
    }
    if (url && this.createAudio) {
      this.preparedAudio = this.createAudio(url);
      this.preparedAudio.preload = "metadata";
    }
  }

  stopSpeaking() {
    this.generation += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onplaying = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    this.finishPending?.();
    this.finishPending = null;
    this.synthesis?.cancel();
    this.setState("idle");
  }

  async speakWord({ text, customAudioUrl }: SpeakWordInput): Promise<void> {
    this.stopSpeaking();
    const generation = this.generation;
    this.setState("loading");

    if (customAudioUrl && this.createAudio) {
      const played = await this.tryCustomAudio(customAudioUrl, generation);
      if (generation !== this.generation) return;
      if (played) return;
    }

    if (generation !== this.generation) return;
    const spoken = await this.trySpeech(text, generation);
    if (generation !== this.generation) return;
    if (spoken) return;
    this.setState("error");
    throw new PlaybackUnavailableError();
  }

  private tryCustomAudio(url: string, generation: number): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = this.preparedAudio?.src === url ? this.preparedAudio : this.createAudio!(url);
      this.preparedAudio = null;
      this.audio = audio;
      audio.preload = "auto";
      audio.currentTime = 0;
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        if (!result && this.audio === audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        if (this.audio === audio) this.audio = null;
        this.finishPending = null;
        audio.onplaying = null;
        audio.onended = null;
        audio.onerror = null;
        resolve(result);
      };
      this.finishPending = () => finish(false);
      audio.onplaying = () => {
        if (generation === this.generation) this.setState("playing");
      };
      audio.onended = () => {
        if (generation === this.generation) this.setState("idle");
        finish(true);
      };
      audio.onerror = () => finish(false);
      try {
        void audio.play().catch(() => finish(false));
      } catch {
        finish(false);
      }
    });
  }

  private trySpeech(text: string, generation: number): Promise<boolean> {
    if (!this.isSpeechAvailable()) return Promise.resolve(false);
    return new Promise((resolve) => {
      const utterance = this.createUtterance!(text);
      utterance.lang = "es-CR";
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voice = selectSpanishVoice(this.voices);
      if (voice) utterance.voice = voice;
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        this.finishPending = null;
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
        resolve(result);
      };
      this.finishPending = () => finish(false);
      utterance.onstart = () => {
        if (generation === this.generation) this.setState("playing");
      };
      utterance.onend = () => {
        if (generation === this.generation) this.setState("idle");
        finish(true);
      };
      utterance.onerror = () => finish(false);
      try {
        this.synthesis!.cancel();
        this.synthesis!.speak(utterance);
      } catch {
        finish(false);
      }
    });
  }

  dispose() {
    this.stopSpeaking();
    this.prepareCustomAudio(null);
    this.synthesis?.removeEventListener?.("voiceschanged", this.refreshVoices);
    this.subscribers.clear();
  }
}
