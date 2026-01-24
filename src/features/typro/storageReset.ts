// src/features/typro/storageReset.ts
"use client";

export const TYPRO_PREFIX = "typro-";
export const TYPRO_SOUND_KEY = "typro-sound-enabled";

/**
 * ✅ Typroの記録を“全部”消す（練習/単語 共通）
 * - typro- で始まるキーを削除（ただしサウンド設定は残す）
 * - 結果まとめ/総プレイ数/習慣/キャリアランク など全部が対象
 */
export function resetAllTyproStorage() {
  if (typeof window === "undefined") return;

  const keep = new Set([TYPRO_SOUND_KEY]);

  const removeKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(TYPRO_PREFIX) && !keep.has(key)) {
      removeKeys.push(key);
    }
  }

  removeKeys.forEach((k) => window.localStorage.removeItem(k));
}
