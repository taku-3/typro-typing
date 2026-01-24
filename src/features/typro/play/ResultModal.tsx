// src/features/typro/play/ResultModal.tsx
"use client";

import type { SessionBadge } from "@/features/typro/score";

type Growth = {
  charsDiff: number;
  wordsDiff: number;
  mistypedDiff: number; // ＋は改善（前回 - 今回）
  accuracyDiff: number;
  speedDiff: number;
  scoreDiff: number;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // 🔊 sound toggle（localStorage保存は呼び出し元で行う）
  soundEnabled: boolean;
  onToggleSound: (next: boolean) => void;

  sessionBadge: SessionBadge | null;
  typroScore: number;

  topMistypedKeys: Array<[string, number]>;
  topMistypedWords: Array<[string, number]>;

  previousExists: boolean;
  growth: Growth | null;

  onPracticeWeakWords: () => void;
  canPracticeWeakWords: boolean;

  formatDiffInt: (v: number | undefined) => string;
  formatDiffFloat: (v: number | undefined) => string;
};

export function ResultModal({
  open,
  onClose,
  soundEnabled,
  onToggleSound,
  sessionBadge,
  typroScore,
  topMistypedKeys,
  topMistypedWords,
  previousExists,
  growth,
  onPracticeWeakWords,
  canPracticeWeakWords,
  formatDiffInt,
  formatDiffFloat,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="close"
      />

      {/* modal */}
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg md:text-xl font-semibold">結果まとめ</h2>

              {/* 🔊 Sound toggle */}
              <label className="ml-0 md:ml-2 inline-flex items-center gap-2 text-xs text-slate-300 select-none">
                <span className="text-slate-300">音</span>

                <button
                  type="button"
                  onClick={() => onToggleSound(!soundEnabled)}
                  className={[
                    "relative h-6 w-11 rounded-full border transition",
                    soundEnabled
                      ? "bg-emerald-500/30 border-emerald-400/60"
                      : "bg-slate-800 border-slate-600",
                  ].join(" ")}
                  aria-pressed={soundEnabled}
                  aria-label="音のオンオフ"
                >
                  <span
                    className={[
                      "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-slate-100 transition",
                      soundEnabled ? "left-5" : "left-1",
                    ].join(" ")}
                  />
                </button>

                <span className="w-10 text-right text-slate-300">
                  {soundEnabled ? "ON" : "OFF"}
                </span>
              </label>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              ※プレイ中は入力に集中できるよう、結果はここでまとめて表示します
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 transition"
          >
            閉じる
          </button>
        </div>

        {/* ランク */}
        <div className="mt-5 rounded-2xl border border-sky-400/60 bg-slate-800 p-4">
          <p className="text-sm text-slate-300 mb-2">今回のランク</p>
          {sessionBadge ? (
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={[
                  "px-3 py-1 rounded-xl font-semibold",
                  sessionBadge.colorClass,
                ].join(" ")}
              >
                {sessionBadge.label}（{sessionBadge.letter}）
              </span>
              <span className="text-sm text-slate-300">
                TyproScore：
                <span className="font-semibold">{typroScore}</span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400">今回のランクを計算中…</p>
          )}
        </div>

        {/* 苦手キー */}
        <div className="mt-5">
          <p className="text-sm text-slate-300 mb-1">苦手キー（ミス上位）</p>
          {topMistypedKeys.length === 0 ? (
            <p className="text-xs text-slate-400">
              今回は目立ったミスの多いキーはありませんでした。
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {topMistypedKeys.map(([key, count]) => (
                <li
                  key={key}
                  className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm"
                >
                  <span className="font-mono text-base mr-1">{key}</span>
                  <span className="text-xs text-slate-400">{count} 回ミス</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500 mt-2">
            ※IMEの影響を避けるため、ここはASCIIキーのみ集計しています
          </p>
        </div>

        {/* ミス単語 */}
        <div className="mt-5">
          <p className="text-sm text-slate-300 mb-2">ミスした単語（上位）</p>

          <div className="mb-3">
            <button
              onClick={onPracticeWeakWords}
              disabled={!canPracticeWeakWords}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              弱点単語だけ集中練習
            </button>
            {!canPracticeWeakWords && (
              <p className="mt-2 text-xs text-slate-400">
                ※ミスした単語がないため、弱点練習は利用できません
              </p>
            )}
          </div>

          {topMistypedWords.length === 0 ? (
            <p className="text-xs text-slate-400">
              ミスした単語はありませんでした。
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {topMistypedWords.map(([word, count]) => (
                <li
                  key={word}
                  className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm"
                >
                  <span className="font-mono text-base mr-1">{word}</span>
                  <span className="text-xs text-slate-400">{count} 回</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 前回比 */}
        <div className="mt-5">
          <p className="text-sm text-slate-300 mb-1">前回比（成長率）</p>
          {!previousExists ? (
            <p className="text-xs text-slate-400">
              今回が初回プレイのため、前回比はありません。
            </p>
          ) : growth ? (
            <ul className="space-y-1 text-xs md:text-sm text-slate-200">
              <li>・完了文字数：{formatDiffInt(growth.charsDiff)} 文字</li>
              <li>・完了単語数：{formatDiffInt(growth.wordsDiff)} 単語</li>
              <li>
                ・ミスタイプ数：{formatDiffInt(growth.mistypedDiff)} 回
                <span className="text-slate-400 ml-1">（＋は改善）</span>
              </li>
              <li>・正確率：{formatDiffInt(growth.accuracyDiff)} pt</li>
              <li>・速度：{formatDiffFloat(growth.speedDiff)} 文字/秒</li>
              <li>・TyproScore：{formatDiffInt(growth.scoreDiff)}</li>
            </ul>
          ) : (
            <p className="text-xs text-slate-400">
              今回のデータを保存しました。次回以降、前回比を表示します。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
