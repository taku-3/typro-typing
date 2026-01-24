// src/features/typro/storage.ts

import type { BadgeRank } from "./score";

/**
 * localStorage Key
 * - STORAGE_KEY は旧形式（全テーマ共通の前回結果）として互換用に残す
 */
export const STORAGE_KEY = "typro-practice-last-result"; // legacy
export const STATS_KEY = "typro-practice-stats";

/**
 * ✅ テーマ別の前回結果（ResultSummary）用キー prefix
 */
export const LAST_RESULT_PREFIX = "typro-practice-last-result:";

/**
 * stats 型（page.tsx の StatsSummary と同一の形）
 */
export type ThemeKey =
  | "home_position_upper"
  | "alphabet_lower"
  | "alphabet_upper"
  | "romaji_upper"
  | "romaji_lower"
  | "special_romaji_1"
  | "special_romaji_2"
  | "programming_symbols";

export type StatsSummary = {
  totalPlays: number;
  totalChars: number;
  totalMistypes: number;
  bestScore: number;
  careerRankByTheme: Record<ThemeKey, BadgeRank>;
  lastPlayedDate: string | null; // "YYYY-MM-DD"
  streakDays: number;
};

export const DEFAULT_STATS: Omit<StatsSummary, "careerRankByTheme"> = {
  totalPlays: 0,
  totalChars: 0,
  totalMistypes: 0,
  bestScore: 0,
  lastPlayedDate: null,
  streakDays: 0,
};

/**
 * localStorage から読む用のゆるい型（any禁止回避）
 */
type StatsSummaryStorage = Partial<{
  totalPlays: number;
  totalChars: number;
  totalMistypes: number;
  bestScore: number;
  careerRankByTheme: Record<string, BadgeRank>;
  careerRank: BadgeRank; // 旧形式互換
  lastPlayedDate: string | null;
  streakDays: number;
}>;

function isBadgeRank(v: unknown): v is BadgeRank {
  return (
    v === "GREEN" ||
    v === "BRONZE" ||
    v === "SILVER" ||
    v === "GOLD" ||
    v === "PLATINUM"
  );
}

function toRecordBadgeRank(v: unknown): Record<string, BadgeRank> | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const rec = v as Record<string, unknown>;
  const out: Record<string, BadgeRank> = {};
  for (const [k, val] of Object.entries(rec)) {
    if (isBadgeRank(val)) out[k] = val;
  }
  return out;
}

/**
 * THEMES のキー一覧から、テーマごとのランク初期値を作る
 * - base があればそれを優先
 * - 旧形式 fallbackRank があればそれを使う
 * - 何もなければ GREEN
 */
export function initCareerRankByTheme(
  themeKeys: readonly ThemeKey[],
  base?: Record<string, BadgeRank> | undefined,
  fallbackRank?: BadgeRank
): Record<ThemeKey, BadgeRank> {
  const result = {} as Record<ThemeKey, BadgeRank>;
  themeKeys.forEach((key) => {
    const fromBase = base && (base[key] as BadgeRank | undefined);
    result[key] = fromBase ?? fallbackRank ?? "GREEN";
  });
  return result;
}

/**
 * storage の raw(JSON文字列) → StatsSummary に復元
 */
export function parseStatsFromStorage(
  raw: string | null,
  themeKeys: readonly ThemeKey[]
): StatsSummary | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StatsSummaryStorage;

    const careerRankByTheme = initCareerRankByTheme(
      themeKeys,
      toRecordBadgeRank(parsed.careerRankByTheme),
      isBadgeRank(parsed.careerRank) ? parsed.careerRank : undefined
    );

    return {
      totalPlays: typeof parsed.totalPlays === "number" ? parsed.totalPlays : 0,
      totalChars: typeof parsed.totalChars === "number" ? parsed.totalChars : 0,
      totalMistypes:
        typeof parsed.totalMistypes === "number" ? parsed.totalMistypes : 0,
      bestScore: typeof parsed.bestScore === "number" ? parsed.bestScore : 0,
      careerRankByTheme,
      lastPlayedDate:
        typeof parsed.lastPlayedDate === "string" || parsed.lastPlayedDate === null
          ? parsed.lastPlayedDate
          : null,
      streakDays: typeof parsed.streakDays === "number" ? parsed.streakDays : 0,
    };
  } catch {
    return null;
  }
}

/**
 * stats を localStorage に保存
 */
export function saveStats(stats: StatsSummary) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * stats を localStorage から読む（失敗時は null）
 */
export function loadStats(themeKeys: readonly ThemeKey[]): StatsSummary | null {
  if (typeof window === "undefined") return null;
  return parseStatsFromStorage(window.localStorage.getItem(STATS_KEY), themeKeys);
}

/* ------------------------------------------------------------------ */
/* ✅ ResultSummary（前回結果）: テーマ別キー */
/* ------------------------------------------------------------------ */

export function getLastResultKey(theme: ThemeKey) {
  return `${LAST_RESULT_PREFIX}${theme}`;
}

/**
 * ✅ テーマ別に「前回結果」を保存
 */
export function saveLastResultByTheme<T>(theme: ThemeKey, result: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLastResultKey(theme), JSON.stringify(result));
}

/**
 * ✅ テーマ別に「前回結果」を読み込み
 * - 新キー（prefix + theme）があればそれを読む
 * - なければ旧キー（全テーマ共通）を読む
 *   → 読めたら「このテーマの新キー」に1回だけコピーして互換移行
 */
export function loadLastResultByTheme<T>(theme: ThemeKey): T | null {
  if (typeof window === "undefined") return null;

  // 1) 新キー（テーマ別）
  try {
    const raw = window.localStorage.getItem(getLastResultKey(theme));
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // noop
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* legacy API（互換用に残す） */
/* ------------------------------------------------------------------ */

/**
 * @deprecated テーマ別へ移行中。新規利用は saveLastResultByTheme を推奨。
 */
export function saveLastResult<T>(result: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

/**
 * @deprecated テーマ別へ移行中。新規利用は loadLastResultByTheme を推奨。
 */
export function loadLastResult<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 全リセット
 * - stats
 * - 旧 lastResult（全テーマ共通）
 * - 新 lastResult（テーマ別 prefix一致を全消し）
 */
export function resetAllStorage() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STATS_KEY);
  window.localStorage.removeItem(STORAGE_KEY);

  // prefix一致（テーマ別の前回結果）を全削除
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(LAST_RESULT_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}
