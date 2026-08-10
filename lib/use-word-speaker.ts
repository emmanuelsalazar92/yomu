"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WordPlaybackController,
  type PlaybackState,
  type SpeakWordInput
} from "@/lib/audio-playback";

const STORAGE_KEY = "yomu-audio-volume";

export function useWordSpeaker(stopKey?: unknown, preloadUrl?: string | null) {
  const controllerRef = useRef<WordPlaybackController | null>(null);
  const [state, setState] = useState<PlaybackState>("idle");
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    const controller = new WordPlaybackController();
    controllerRef.current = controller;
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    const stored = storedValue === null ? Number.NaN : Number(storedValue);
    const initialVolume = Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 1;
    controller.setVolume(initialVolume);
    queueMicrotask(() => {
      setSpeechAvailable(controller.isSpeechAvailable());
      setVolumeState(initialVolume);
    });
    const unsubscribe = controller.subscribe(setState);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") controller.stopSpeaking();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.stopSpeaking();
  }, [stopKey]);

  useEffect(() => {
    controllerRef.current?.prepareCustomAudio(preloadUrl);
  }, [preloadUrl]);

  const speakWord = useCallback(
    (input: SpeakWordInput) =>
      controllerRef.current?.speakWord(input) ?? Promise.reject(new Error("Audio no disponible")),
    []
  );
  const stopSpeaking = useCallback(() => controllerRef.current?.stopSpeaking(), []);
  const setVolume = useCallback((value: number) => {
    const safe = Math.max(0, Math.min(1, value));
    setVolumeState(safe);
    window.localStorage.setItem(STORAGE_KEY, String(safe));
    controllerRef.current?.setVolume(safe);
  }, []);

  return {
    state,
    speakWord,
    stopSpeaking,
    isSpeechAvailable: () => speechAvailable,
    volume,
    setVolume,
    play: (text: string, customAudioUrl?: string | null) => speakWord({ text, customAudioUrl }),
    stop: stopSpeaking,
    isPlaying: state === "loading" || state === "playing"
  };
}
