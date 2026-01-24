// src/features/typro/word/storage.ts
import type { BadgeRank } from "../score";
import type { WordThemeKey } from "./words";

export const WORD_LAST_RESULT_KEY = "typro-word-last-result";
export const WORD_STATS_KEY = "typro-word-stats";

export type WordStatsSummary = {
  totalPlays: number;
  totalChars: number;
  totalMistypes: number;
  bestScore: number;
  careerRankByTheme: Record<WordThemeKey, BadgeRank>;
  lastPlayedDate: string | null;
  streakDays: number;
};

export const DEFAULT_WORD_STATS: Omit<WordStatsSummary, "careerRankByTheme"> = {
  totalPlays: 0,
  totalChars: 0,
  totalMistypes: 0,
  bestScore: 0,
  lastPlayedDate: null,
  streakDays: 0,
};

type WordStatsStorage = Partial<{
  totalPlays: number;
  totalChars: number;
  totalMistypes: number;
  bestScore: number;
  careerRankByTheme: Record<string, BadgeRank>;
  lastPlayedDate: string | null;
  streakDays: number;
}>;

function isBadgeRank(v: unknown): v is BadgeRank {
  return v === "GREEN" || v === "BRONZE" || v === "SILVER" || v === "GOLD" || v === "PLATINUM";
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

export function initCareerRankByTheme(
  themeKeys: readonly WordThemeKey[],
  base?: Record<string, BadgeRank>
): Record<WordThemeKey, BadgeRank> {
  const result = {} as Record<WordThemeKey, BadgeRank>;
  themeKeys.forEach((k) => {
    result[k] = (base?.[k] as BadgeRank | undefined) ?? "GREEN";
  });
  return result;
}

export function loadWordStats(themeKeys: readonly WordThemeKey[]): WordStatsSummary | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(WORD_STATS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WordStatsStorage;
    const careerRankByTheme = initCareerRankByTheme(themeKeys, toRecordBadgeRank(parsed.careerRankByTheme));

    return {
      totalPlays: typeof parsed.totalPlays === "number" ? parsed.totalPlays : 0,
      totalChars: typeof parsed.totalChars === "number" ? parsed.totalChars : 0,
      totalMistypes: typeof parsed.totalMistypes === "number" ? parsed.totalMistypes : 0,
      bestScore: typeof parsed.bestScore === "number" ? parsed.bestScore : 0,
      careerRankByTheme,
      lastPlayedDate: typeof parsed.lastPlayedDate === "string" || parsed.lastPlayedDate === null ? parsed.lastPlayedDate : null,
      streakDays: typeof parsed.streakDays === "number" ? parsed.streakDays : 0,
    };
  } catch {
    return null;
  }
}

export function saveWordStats(stats: WordStatsSummary) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORD_STATS_KEY, JSON.stringify(stats));
}

/** resultId（theme:level:case のようなユニークID）で保存する */
export function saveWordLastResult<T>(resultId: string, result: T) {
  if (typeof window === "undefined") return;
  const key = `${WORD_LAST_RESULT_KEY}:${resultId}`;
  window.localStorage.setItem(key, JSON.stringify(result));
}

export function loadWordLastResult<T>(resultId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${WORD_LAST_RESULT_KEY}:${resultId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resetWordStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORD_STATS_KEY);
}
