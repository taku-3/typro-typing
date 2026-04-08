"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLeaderboard, type LeaderboardItem } from "@/lib/api/ranking";
import {
  WORD_THEMES,
  levelLabel,
  caseLabel,
  type WordThemeKey,
  type WordLevel,
  type CaseMode,
} from "@/features/typro/word/words";
import { getStoredPlayer } from "@/lib/auth-storage";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "alltime";

export default function RankingPageClient() {
  const searchParams = useSearchParams();
  const themeKeys = Object.keys(WORD_THEMES) as WordThemeKey[];

  const [periodType, setPeriodType] = useState<PeriodType>(
    (searchParams.get("period_type") as PeriodType) || "weekly",
  );
  const [themeId, setThemeId] = useState<WordThemeKey>(
    (searchParams.get("theme_id") as WordThemeKey) || "english_colors",
  );
  const [level, setLevel] = useState<WordLevel>(
    (searchParams.get("level") as WordLevel) || "easy",
  );
  const [caseMode, setCaseMode] = useState<CaseMode>(
    (searchParams.get("case_mode") as CaseMode) || "lower",
  );
  const [durationSec, setDurationSec] = useState(
    Number(searchParams.get("duration_sec") || "60"),
  );

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [items, setItems] = useState<LeaderboardItem[]>([]);

  const storedPlayer = getStoredPlayer();
  const myPlayerId = storedPlayer?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErrorText("");

      const res = await getLeaderboard({
        period_type: periodType,
        theme_id: themeId,
        level,
        case_mode: caseMode,
        duration_sec: durationSec,
        limit: 10,
      });

      if (cancelled) return;

      setLoading(false);

      if (!res.ok) {
        setItems([]);
        setPeriodStart("");
        setErrorText(res.error ?? "ランキング取得に失敗しました");
        return;
      }

      setItems(res.items);
      setPeriodStart(res.period_start);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [periodType, themeId, level, caseMode, durationSec]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">ランキング</h1>
            <p className="text-sm text-slate-300 mt-1">
              単語モードのテーマ別ランキング
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            タイトルへ戻る
          </Link>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-sm text-slate-300 mb-2">期間</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="daily">日間</option>
                <option value="weekly">週間</option>
                <option value="monthly">月間</option>
                <option value="yearly">年間</option>
                <option value="alltime">累計</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                テーマ
              </label>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as WordThemeKey)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                {themeKeys.map((key) => (
                  <option key={key} value={key}>
                    {WORD_THEMES[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                レベル
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as WordLevel)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                {(["easy", "normal", "hard"] as const).map((lv) => (
                  <option key={lv} value={lv}>
                    {levelLabel(lv)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                ケース
              </label>
              <select
                value={caseMode}
                onChange={(e) => setCaseMode(e.target.value as CaseMode)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                {(["lower", "title", "upper", "mixed"] as const).map((cm) => (
                  <option key={cm} value={cm}>
                    {caseLabel(cm)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">時間</label>
              <select
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value={30}>30秒</option>
                <option value={60}>60秒</option>
                <option value={90}>90秒</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">ランキング一覧</h2>
              <p className="text-xs text-slate-400 mt-1">
                period_start: {periodStart || "—"}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-300">読み込み中...</p>
          ) : errorText ? (
            <p className="text-sm text-rose-300">{errorText}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">
              この条件ではまだランキングデータがありません。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="text-left py-3 pr-3">順位</th>
                    <th className="text-left py-3 pr-3">名前</th>
                    <th className="text-right py-3 pr-3">スコア</th>
                    <th className="text-left py-3">達成日時</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const isMe =
                      myPlayerId !== null && item.player_id === myPlayerId;

                    return (
                      <tr
                        key={`${item.player_id}-${item.first_achieved_at}`}
                        className={[
                          "border-b border-slate-800 transition",
                          isMe ? "bg-sky-400/10" : "",
                        ].join(" ")}
                      >
                        <td className="py-3 pr-3 font-semibold">
                          <div className="flex items-center gap-2">
                            <span>{index + 1}</span>
                            {isMe ? (
                              <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                                あなた
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 pr-3 font-semibold">
                          <span className={isMe ? "text-sky-300" : ""}>
                            {item.display_name}
                          </span>
                        </td>

                        <td
                          className={[
                            "py-3 pr-3 text-right font-mono",
                            isMe ? "text-sky-300" : "",
                          ].join(" ")}
                        >
                          {item.best_score}
                        </td>

                        <td className="py-3 text-slate-300">
                          {new Date(item.first_achieved_at).toLocaleString(
                            "ja-JP",
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}