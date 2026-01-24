"use client";

import { useCallback, useEffect, useRef } from "react";

type SfxKind = "tap" | "correct" | "wrong" | "finish";

type Options = {
  enabled: boolean;
  bgmVolume?: number;
  sfxVolume?: number;
};

const SFX_URL: Record<SfxKind, string> = {
  tap: "/sounds/tap.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  finish: "/sounds/finish.mp3",
};

const BGM_URL = "/sounds/bgm.mp3";

export function useGameSound({
  enabled,
  bgmVolume = 0.22,
  sfxVolume = 0.7,
}: Options) {
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const unlock = useCallback(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    if (!bgmRef.current) {
      const bgm = new Audio(BGM_URL);
      bgm.loop = true;
      bgm.volume = bgmVolume;
      bgmRef.current = bgm;
    }
  }, [enabled, bgmVolume]);

  const playSfx = useCallback(
    (kind: SfxKind) => {
      if (!enabled) return;
      if (typeof window === "undefined") return;

      const a = new Audio(SFX_URL[kind]);
      a.volume = sfxVolume;
      a.play().catch(() => {});
    },
    [enabled, sfxVolume]
  );

  const startBgm = useCallback(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    if (!bgmRef.current) {
      const bgm = new Audio(BGM_URL);
      bgm.loop = true;
      bgm.volume = bgmVolume;
      bgmRef.current = bgm;
    } else {
      bgmRef.current.volume = bgmVolume;
    }

    bgmRef.current.play().catch(() => {});
  }, [enabled, bgmVolume]);

  const stopBgm = useCallback(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    bgm.pause();

    const next = new Audio(BGM_URL);
    next.loop = true;
    next.volume = bgm.volume;
    bgmRef.current = next;
  }, []);

  // 🔇 音OFF時はBGM停止
  useEffect(() => {
    if (!enabled) stopBgm();
  }, [enabled, stopBgm]);

  // ✅ ここが追加する正しい場所：アンマウント時にBGM停止（returnの直前）
  useEffect(() => {
    return () => {
      const bgm = bgmRef.current;
      if (!bgm) return;
      bgm.pause();
      // ⚠️ あなたの環境では「refを書き換える」系で怒られる可能性があるので、
      // bgmRef.current = null は“敢えて”しない（pauseだけで止まる）
    };
  }, []);

  return { unlock, playSfx, startBgm, stopBgm };
}
