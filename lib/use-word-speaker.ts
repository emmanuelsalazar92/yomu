"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "yomu-audio-volume";

export function useWordSpeaker() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolumeState] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    const restoreTimer = window.setTimeout(() => {
      if (Number.isFinite(stored) && stored >= 0 && stored <= 1) setVolumeState(stored);
    }, 0);
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(restoreTimer);
      stop();
    };
  }, [stop]);

  const setVolume = useCallback((value: number) => {
    const safe = Math.max(0, Math.min(1, value));
    setVolumeState(safe);
    window.localStorage.setItem(STORAGE_KEY, String(safe));
    if (audioRef.current) audioRef.current.volume = safe;
  }, []);

  const speakTts = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 0.82;
      utterance.volume = volume;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    },
    [volume]
  );

  const play = useCallback(
    async (text: string, audioUrl?: string | null) => {
      stop();
      if (!audioUrl) {
        speakTts(text);
        return;
      }
      const audio = new Audio(audioUrl);
      audio.volume = volume;
      audioRef.current = audio;
      audio.onended = () => {
        audioRef.current = null;
        setIsPlaying(false);
      };
      audio.onerror = () => {
        audioRef.current = null;
        setIsPlaying(false);
        speakTts(text);
      };
      try {
        setIsPlaying(true);
        await audio.play();
      } catch {
        audioRef.current = null;
        setIsPlaying(false);
        speakTts(text);
      }
    },
    [speakTts, stop, volume]
  );

  return { play, stop, isPlaying, volume, setVolume };
}
