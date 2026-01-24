// src/features/typro/score.ts

export type BadgeRank = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "GREEN";

export type StatsSummaryForScore = {
  totalPlays: number;
  streakDays: number;
};

export type BadgeVisual = {
  rank: BadgeRank;
  label: string;
  colorClass: string;
  letter: "S" | "A" | "B" | "C" | "D";
};

export type SessionBadge = BadgeVisual & {
  accuracyGrade: string;
  playsGrade: string;
  habitGrade: string;
};

/** TyproScore（総合スコア）計算 */
export function calculateTyproScore(
  completedChars: number,
  mistypedCount: number,
  accuracy: number, // %
  averageSpeed: number, // 文字/秒
  selectedSeconds: number
): number {
  const normalizedChars = completedChars * (60 / selectedSeconds);
  const base = normalizedChars * 2; // 正打1文字2点
  const penalty = mistypedCount * 3;

  let accBonus = 0;
  if (accuracy >= 98) accBonus = 40;
  else if (accuracy >= 95) accBonus = 25;
  else if (accuracy >= 90) accBonus = 10;
  else if (accuracy < 80) accBonus = -10;

  let speedBonus = 0;
  if (averageSpeed >= 5) speedBonus = 40;
  else if (averageSpeed >= 3) speedBonus = 25;
  else if (averageSpeed >= 2) speedBonus = 10;

  const raw = base - penalty + accBonus + speedBonus;
  return Math.max(0, Math.round(raw));
}

/** 正確率の解説ラベル */
export function getAccuracyGrade(accuracy: number): string {
  if (accuracy >= 98) return "S（ほぼノーミス）";
  if (accuracy >= 95) return "A（とても正確）";
  if (accuracy >= 90) return "B（実用レベル）";
  if (accuracy >= 80) return "C（ミスやや多め）";
  return "D（正確さを優先して練習）";
}

/** 総プレイ数の解説ラベル */
export function getPlaysGrade(totalPlays: number): string {
  if (totalPlays >= 100) return `Lv3（ヘビーユーザー：${totalPlays}回）`;
  if (totalPlays >= 30) return `Lv2（継続ユーザー：${totalPlays}回）`;
  if (totalPlays >= 10) return `Lv1（お試し以上：${totalPlays}回）`;
  return `Lv0（これから：${totalPlays}回）`;
}

/** 習慣の解説ラベル */
export function getHabitGrade(streakDays: number): string {
  if (streakDays >= 14) return `Lv3（神習慣：${streakDays}日連続）`;
  if (streakDays >= 7) return `Lv2（良い習慣：${streakDays}日連続）`;
  if (streakDays >= 3) return `Lv1（始まり：${streakDays}日連続）`;
  return `Lv0（まずは3日連続を目標）`;
}

function rankToLetter(rank: BadgeRank): "S" | "A" | "B" | "C" | "D" {
  if (rank === "PLATINUM") return "S";
  if (rank === "GOLD") return "A";
  if (rank === "SILVER") return "B";
  if (rank === "BRONZE") return "C";
  return "D";
}

function baseRankFromScore(score: number, accuracy: number): BadgeRank {
  if (score >= 220 && accuracy >= 97) return "PLATINUM";
  if (score >= 180 && accuracy >= 95) return "GOLD";
  if (score >= 130 && accuracy >= 90) return "SILVER";
  if (score >= 80 && accuracy >= 80) return "BRONZE";
  return "GREEN";
}

/** 習慣&プレイ数で1ランク昇格（降格なし） */
function upgradeByHabit(
  rank: BadgeRank,
  totalPlays: number,
  streakDays: number
): BadgeRank {
  const canUpgrade = totalPlays >= 30 && streakDays >= 7;
  if (!canUpgrade) return rank;

  if (rank === "GREEN") return "BRONZE";
  if (rank === "BRONZE") return "SILVER";
  if (rank === "SILVER") return "GOLD";
  if (rank === "GOLD") return "PLATINUM";
  return "PLATINUM";
}

export function getBadgeVisual(rank: BadgeRank): BadgeVisual {
  const labelMap: Record<BadgeRank, string> = {
    PLATINUM: "プラチナ級",
    GOLD: "ゴールド級",
    SILVER: "シルバー級",
    BRONZE: "ブロンズ級",
    GREEN: "グリーン級",
  };

  const colorMap: Record<BadgeRank, string> = {
    PLATINUM: "bg-slate-100 text-slate-900",
    GOLD: "bg-yellow-400 text-slate-900",
    SILVER: "bg-slate-300 text-slate-900",
    BRONZE: "bg-amber-700 text-amber-50",
    GREEN: "bg-emerald-600 text-emerald-50",
  };

  return {
    rank,
    label: labelMap[rank],
    colorClass: colorMap[rank],
    letter: rankToLetter(rank),
  };
}

export function getSessionBadge(
  score: number,
  accuracy: number,
  stats: StatsSummaryForScore
): SessionBadge {
  const base = baseRankFromScore(score, accuracy);
  const upgraded = upgradeByHabit(base, stats.totalPlays, stats.streakDays);
  const visual = getBadgeVisual(upgraded);

  return {
    ...visual,
    accuracyGrade: getAccuracyGrade(accuracy),
    playsGrade: getPlaysGrade(stats.totalPlays),
    habitGrade: getHabitGrade(stats.streakDays),
  };
}
