"use client";

import { useEffect, useRef, useState } from "react";
import {
  WordPlaybackController,
  type PlaybackState,
  type SpeakWordInput
} from "@/lib/audio-playback";

export function useWordSpeaker(stopKey?: unknown, preloadUrl?: string | null) {
  const controllerRef = useRef<WordPlaybackController | null>(null);
  const [state, setState] = useState<PlaybackState>("idle");
  const [speechAvailable, setSpeechAvailable] = useState(false);

  useEffect(() => {
    const controller = new WordPlaybackController();
    controllerRef.current = controller;
    queueMicrotask(() => setSpeechAvailable(controller.isSpeechAvailable()));
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

  return {
    state,
    speakWord: (input: SpeakWordInput) =>
      controllerRef.current?.speakWord(input) ?? Promise.reject(new Error("Audio no disponible")),
    stopSpeaking: () => controllerRef.current?.stopSpeaking(),
    isSpeechAvailable: () => speechAvailable
  };
}
